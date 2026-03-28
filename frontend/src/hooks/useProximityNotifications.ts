import { useEffect, useRef } from 'react';
import { POI, GPSState } from '../types';
import { CATEGORY_EMOJI } from '../utils/markers';

const TIER_LABEL: Record<number, string> = {
  1: '⭐ Must-See!',
  2: '👍 Recommended',
  3: 'Worth a visit',
  4: 'If passing by',
};

/** Alert when this many driving minutes away. */
const ALERT_MINUTES = 10;
/** Fallback speed when GPS reports nothing (highway cruise). */
const FALLBACK_SPEED_KMH = 80;
/** Never shrink the alert bubble below this (parked / slow traffic). */
const MIN_RADIUS_M = 3_000;
/** Cap so we don't alert for attractions across the county. */
const MAX_RADIUS_M = 25_000;

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
 * Fires a browser notification when the user is ~10 driving minutes away from
 * a POI. The alert radius shrinks/grows with the live GPS speed so the warning
 * always arrives roughly ALERT_MINUTES minutes before arrival.
 * Clicking the notification launches Google Maps with turn-by-turn navigation
 * already running, destination pre-set.
 *
 * @param pois  List of POIs to watch (use the filtered set from usePOIs)
 * @param gps   Live GPS state from useGPS
 */
export function useProximityNotifications(
  pois: POI[],
  gps: GPSState,
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

    const userLat = gps.lat;
    const userLng = gps.lng;
    if (userLat === null || userLng === null) return;

    // Compute alert radius from live speed (10 min ahead at current pace).
    const speedMps =
      gps.speed !== null && gps.speed > 0.5
        ? gps.speed
        : FALLBACK_SPEED_KMH / 3.6;
    const alertRadius = Math.max(
      MIN_RADIUS_M,
      Math.min(MAX_RADIUS_M, speedMps * ALERT_MINUTES * 60),
    );

    for (const poi of pois) {
      if (notifiedRef.current.has(poi.id)) continue;

      const dist = haversineMeters(userLat, userLng, poi.lat, poi.lng);
      if (dist > alertRadius) continue;

      notifiedRef.current.add(poi.id);

      // ETA using the same speed we used for the alert radius.
      const etaMin = Math.max(1, Math.round(dist / speedMps / 60));

      const icon = CATEGORY_EMOJI[poi.category] ?? '📍';
      // dir_action=navigate starts turn-by-turn immediately — no tap needed.
      const mapsUrl =
        `https://www.google.com/maps/dir/?api=1` +
        `&origin=${userLat},${userLng}` +
        `&destination=${poi.lat},${poi.lng}` +
        `&travelmode=driving` +
        `&dir_action=navigate`;

      const n = new Notification(`${icon} ${poi.name}`, {
        body: [
          `~${etaMin} min ahead · ${formatDist(dist)}`,
          TIER_LABEL[poi.tier],
          'Tap to start navigation →',
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
  }, [gps.lat, gps.lng, gps.speed, gps.tracking, pois]);

  // ── Clear the notified set when GPS stops (new session = fresh alerts) ────
  useEffect(() => {
    if (!gps.tracking) {
      notifiedRef.current.clear();
    }
  }, [gps.tracking]);
}
