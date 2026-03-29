import { useEffect, useRef, useState, useCallback } from 'react';
import { POI, GPSState } from '../types';
import { CATEGORY_EMOJI } from '../utils/markers';

const TIER_LABEL: Record<number, string> = {
  1: '\u2B50 Must-See!',
  2: '\U0001F44D Recommended',
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

export interface ProximityAlert {
  id: string;
  poi: POI;
  distM: number;
  etaMin: number;
  mapsUrl: string;
  ts: number;
}

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
  return m < 1000 ? Math.round(m) + ' m' : (m / 1000).toFixed(1) + ' km';
}

export function useProximityNotifications(
  pois: POI[],
  gps: GPSState,
): { alerts: ProximityAlert[]; dismissAlert: (id: string) => void } {
  const notifiedRef = useRef<Set<string>>(new Set());
  const [alerts, setAlerts] = useState<ProximityAlert[]>([]);

  const dismissAlert = useCallback((id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  // Ask for notification permission when GPS starts
  useEffect(() => {
    if (!gps.tracking || typeof Notification === 'undefined') return;
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {/* ignore */});
    }
  }, [gps.tracking]);

  // Clear alerts when GPS stops
  useEffect(() => {
    if (!gps.tracking) {
      notifiedRef.current.clear();
      setAlerts([]);
    }
  }, [gps.tracking]);

  useEffect(() => {
    if (!gps.tracking || gps.lat === null || gps.lng === null) return;

    const userLat = gps.lat;
    const userLng = gps.lng;

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
      const etaMin = Math.max(1, Math.round(dist / speedMps / 60));
      const icon = CATEGORY_EMOJI[poi.category] ?? '\U0001F4CD';

      const mapsUrl =
        'https://www.google.com/maps/dir/?api=1' +
        '&origin=' + userLat + ',' + userLng +
        '&destination=' + poi.lat + ',' + poi.lng +
        '&travelmode=driving&dir_action=navigate';

      const alert: ProximityAlert = {
        id: poi.id + '-' + Date.now(),
        poi,
        distM: dist,
        etaMin,
        mapsUrl,
        ts: Date.now(),
      };

      // In-app toast (always works)
      setAlerts(prev => [...prev, alert]);

      // Native OS notification (works on desktop + Android Chrome)
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try {
          const n = new Notification(icon + ' ' + poi.name, {
            body: '~' + etaMin + ' min ahead \u00B7 ' + formatDist(dist) + '\n' +
                  TIER_LABEL[poi.tier] + '\nTap to start navigation \u2192',
            tag: 'proximity-' + poi.id,
            requireInteraction: poi.tier <= 2,
          });
          n.onclick = () => { window.open(mapsUrl, '_blank'); n.close(); };
        } catch { /* some browsers block even with permission */ }
      }
    }
  }, [gps.lat, gps.lng, gps.speed, gps.tracking, pois]);

  return { alerts, dismissAlert };
}
