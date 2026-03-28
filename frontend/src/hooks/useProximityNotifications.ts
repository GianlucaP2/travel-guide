import { useEffect, useRef } from 'react';
import { POI, GPSState } from '../types';
import { CATEGORY_EMOJI } from '../utils/markers';

const TIER_LABEL: Record<number, string> = {
  1: '⭐ Must-See!',
  2: '👍 Recommended',
  3: 'Worth a visit',
  4: 'If passing by',
};

/** Haversine distance in metres between two coordinates. */
function haversineMeters(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDist(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

/**
 * Fires a browser notification whenever the user comes within `radiusMeters`
 * of an unvisited POI. Requests Notification permission automatically
 * the first time GPS tracking is enabled.
 *
 * @param pois          List of POIs to watch (filtered is fine)
 * @param gps           Live GPS state from useGPS
 * @param radiusMeters  Alert radius — defaults to 1 000 m (1 km)
 */
export function useProximityNotifications(
  pois: POI[],
  gps: GPSState,
  radiusMeters = 1_000,
): void {
  const notifiedRef = useRef<Set<string>>(new Set());
  const permissionRef = useRef<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied',
  );

  // ── Ask for permission as soon as the user starts GPS tracking ────────────
  useEffect(() => {
    if (!gps.tracking || typeof Notification === 'undefined') return;
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(p => {
        permissionRef.current = p;
      });
    } else {
      permissionRef.current = Notification.permission;
    }
  }, [gps.tracking]);

  // ── Check proximity on every GPS position update ──────────────────────────
  useEffect(() => {
    if (!gps.tracking || gps.lat === null || gps.lng === null) return;
    if (typeof Notification === 'undefined') return;
    if (permissionRef.current !== 'granted') return;

    for (const poi of pois) {
      if (notifiedRef.current.has(poi.id)) continue;

      const dist = haversineMeters(gps.lat, gps.lng, poi.lat, poi.lng);
      if (dist > radiusMeters) continue;

      notifiedRef.current.add(poi.id);

      // ETA: use live GPS speed if available and plausible, else assume 50 km/h
      const speedMps =
        gps.speed !== null && gps.speed > 0.5 ? gps.speed : 50 / 3.6;
      const etaMin = Math.max(1, Math.round(dist / speedMps / 60));

      const icon = CATEGORY_EMOJI[poi.category] ?? '📍';
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${poi.lat},${poi.lng}`;

      const n = new Notification(`${icon} ${poi.name}`, {
        body: [
          `${formatDist(dist)} away · ~${etaMin} min`,
          TIER_LABEL[poi.tier],
          'Tap for turn-by-turn directions →',
        ].join('\n'),
        tag: `proximity-${poi.id}`,
        // Keep Tier-1 & 2 notifications visible until dismissed
        requireInteraction: poi.tier <= 2,
      });

      n.onclick = () => {
        window.open(mapsUrl, '_blank');
        n.close();
      };
    }
  }, [gps.lat, gps.lng, gps.tracking, pois, radiusMeters]);

  // ── Clear the notified set when GPS stops (new session = fresh alerts) ────
  useEffect(() => {
    if (!gps.tracking) {
      notifiedRef.current.clear();
    }
  }, [gps.tracking]);
}
