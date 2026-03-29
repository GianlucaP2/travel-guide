import { useState, useEffect } from 'react';
import { HWY1_ROUTE as FALLBACK_ROUTE } from '../data/route';

// Bump this key whenever WAYPOINTS change — forces a fresh fetch
const CACHE_KEY = 'hwy1_osrm_v3';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Carefully chosen waypoints that anchor OSRM strictly to Highway 1 / PCH.
 * Every critical decision point is covered — Devil's Slide, Moss Landing
 * (forces coastal Hwy 1 over Hwy 101), the full Big Sur corridor, and
 * Carpinteria/Point Mugu (forces PCH over US-101 through SoCal).
 *
 * All coordinates are [lat, lng]; converted to OSRM's [lng, lat] at fetch time.
 */
const WAYPOINTS: [number, number][] = [
  // ── San Francisco ──────────────────────────────────────────────────────────
  [37.8083, -122.4750], // Golden Gate Bridge south tower
  [37.7935, -122.4837], // Baker Beach
  [37.7789, -122.5117], // Lands End / Sutro Baths
  [37.7594, -122.5108], // Ocean Beach SF
  // ── Pacifica ───────────────────────────────────────────────────────────────
  [37.6573, -122.4985], // Pacifica Linda Mar Beach
  [37.6230, -122.4859], // Rockaway Beach, Pacifica
  [37.6073, -122.4882], // Devil's Slide (old Hwy 1 alignment on cliff)
  [37.5714, -122.5120], // Montara State Beach
  // ── Half Moon Bay ──────────────────────────────────────────────────────────
  [37.5063, -122.4970], // Pillar Point / Mavericks
  [37.4636, -122.4467], // Half Moon Bay State Beach
  [37.3420, -122.4050], // San Gregorio State Beach
  [37.2592, -122.4101], // Pescadero State Beach
  [37.1830, -122.3959], // Pigeon Point Lighthouse
  [37.1157, -122.3344], // Año Nuevo State Park
  // ── Santa Cruz ─────────────────────────────────────────────────────────────
  [37.0590, -122.2040], // Davenport, CA (Hwy 1 coastal)
  [36.9951, -122.0721], // Capitola area (south of Santa Cruz)
  [36.9644, -122.0185], // Santa Cruz Boardwalk
  [36.9524, -122.0543], // Natural Bridges State Beach
  // ── SC → Monterey (critical: forces Hwy 1 coast over Hwy 101 inland) ──────
  [36.9000, -121.9600], // Aptos / Rio del Mar
  [36.8054, -121.7871], // Moss Landing — the key waypoint that keeps OSRM
                         // on the coastal Hwy 1 and off Hwy 101
  [36.6815, -121.8025], // Marina, CA
  // ── Monterey / Pacific Grove ───────────────────────────────────────────────
  [36.6184, -121.9019], // Monterey Aquarium / Cannery Row
  [36.6056, -121.8929], // Fisherman's Wharf Monterey
  [36.6276, -121.9152], // Lover's Point, Pacific Grove
  // ── 17-Mile Drive / Carmel ─────────────────────────────────────────────────
  [36.5729, -121.9683], // Lone Cypress / 17-Mile Drive
  [36.5600, -121.9460], // Pebble Beach
  [36.5475, -121.9263], // Carmel Beach
  [36.5406, -121.9196], // Carmel Mission
  [36.5166, -121.9385], // Point Lobos State Reserve
  // ── Big Sur (no alternate roads — Hwy 1 is the only route) ───────────────
  [36.4800, -121.9200], // Garrapata State Beach
  [36.4350, -121.9200], // Rocky Point
  [36.3717, -121.9017], // Bixby Creek Bridge ★
  [36.3300, -121.8800], // Hurricane Point viewpoint
  [36.3068, -121.8995], // Point Sur Lighthouse
  [36.2698, -121.8186], // Big Sur River Inn
  [36.2501, -121.7820], // Pfeiffer Big Sur State Park
  [36.2423, -121.7888], // Nepenthe Restaurant
  [36.2362, -121.8174], // Pfeiffer Beach (Sycamore Canyon)
  [36.1582, -121.6715], // McWay Falls / Julia Pfeiffer Burns SP ★
  [36.1310, -121.6465], // Esalen Institute
  [36.0500, -121.5500], // Vicente Creek area
  [36.0218, -121.5380], // Lucia Lodge
  [35.9261, -121.4683], // Sand Dollar Beach
  [35.8520, -121.4200], // Gorda
  [35.7900, -121.3700], // Ragged Point
  // ── San Simeon ─────────────────────────────────────────────────────────────
  [35.6624, -121.2611], // Piedras Blancas Elephant Seal Rookery ★
  [35.6411, -121.1884], // San Simeon (Hwy 1 itself — not castle spur road)
  // ── Cambria ────────────────────────────────────────────────────────────────
  [35.5725, -121.1100], // Moonstone Beach Boardwalk
  // ── Cayucos / Morro Bay ────────────────────────────────────────────────────
  [35.4427, -120.8917], // Cayucos State Beach & Pier
  [35.3658, -120.8668], // Morro Rock / Morro Bay
  // ── SLO / Pismo ────────────────────────────────────────────────────────────
  [35.2791, -120.6612], // San Luis Obispo (Hwy 1 / Hwy 101 junction)
  [35.1423, -120.6420], // Pismo Beach Pier
  [35.0966, -120.6322], // Oceano Dunes
  // ── Santa Maria valley / Vandenberg corridor ───────────────────────────────
  [34.9750, -120.6450], // Nipomo Mesa
  [34.7540, -120.5960], // Guadalupe-Nipomo Dunes
  [34.6200, -120.4600], // Near Vandenberg Space Force Base
  [34.5400, -120.3500], // Near Lompoc (Hwy 1 inland)
  [34.4712, -120.2269], // Gaviota State Beach (Hwy 1 rejoins coast)
  // ── Santa Barbara ──────────────────────────────────────────────────────────
  [34.4264, -119.7136], // Santa Barbara Mission / Hwy 101+1
  [34.4078, -119.6896], // Stearns Wharf
  // ── Carpinteria → Ventura (critical: forces PCH over US-101 inland) ────────
  [34.3973, -119.5174], // Carpinteria State Beach
  [34.3100, -119.4200], // Rincon Point surf break (PCH)
  [34.2735, -119.2949], // Ventura Pier
  // ── Point Mugu corridor (critical for PCH alignment) ──────────────────────
  [34.1700, -119.1800], // Oxnard Shores
  [34.1065, -119.0543], // Point Mugu State Park (PCH cliffs)
  // ── Malibu ─────────────────────────────────────────────────────────────────
  [34.0467, -118.9414], // Neptune's Net
  [34.0453, -118.9345], // Leo Carrillo State Beach
  [34.0371, -118.8756], // El Matador State Beach ★
  [34.0161, -118.8237], // Zuma Beach
  [34.0012, -118.8069], // Point Dume
  [34.0200, -118.7800], // Malibu Colony
  [34.0359, -118.6783], // Malibu Pier / Surfrider Beach
  [34.0452, -118.5645], // Getty Villa
  // ── Santa Monica / LA ──────────────────────────────────────────────────────
  [34.0100, -118.4960], // Santa Monica Pier ★ (end of Route 66)
  [33.9850, -118.4734], // Venice Beach
];

export type RouteSource = 'cache' | 'osrm' | 'fallback';

export interface UseHwy1RouteResult {
  route: [number, number][];
  loading: boolean;
  source: RouteSource;
}

interface CacheEntry {
  coords: [number, number][];
  ts: number;
}

/**
 * Fetches the precise Hwy 1 / PCH road geometry from the OSRM public API,
 * caches the result in localStorage for 7 days, and falls back to the
 * hardcoded route if offline or on fetch failure.
 *
 * OSRM returns the actual OSM road network snapped to the real highway —
 * typically 3,000–6,000 coordinate pairs for this ~500-mile route.
 */
export function useHwy1Route(): UseHwy1RouteResult {
  const [route, setRoute] = useState<[number, number][]>(FALLBACK_ROUTE);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<RouteSource>('fallback');

  useEffect(() => {
    let cancelled = false;

    // 1. Serve from localStorage cache if fresh
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const entry: CacheEntry = JSON.parse(raw);
        if (Date.now() - entry.ts < CACHE_TTL_MS && entry.coords.length > 100) {
          setRoute(entry.coords);
          setSource('cache');
          setLoading(false);
          return;
        }
      }
    } catch {
      // corrupt cache — fall through to fetch
    }

    // 2. Build OSRM URL (coordinates must be in [lng,lat] order)
    const coordStr = WAYPOINTS.map(([lat, lng]) => `${lng},${lat}`).join(';');
    const url =
      `https://router.project-osrm.org/route/v1/driving/${coordStr}` +
      `?overview=full&geometries=geojson&continue_straight=true`;

    fetch(url, { signal: AbortSignal.timeout(15_000) })
      .then(r => {
        if (!r.ok) throw new Error(`OSRM HTTP ${r.status}`);
        return r.json();
      })
      .then((data: any) => {
        if (cancelled) return;
        if (data.code === 'Ok' && data.routes?.[0]?.geometry?.coordinates?.length) {
          // OSRM returns [lng, lat]; Leaflet needs [lat, lng]
          const coords: [number, number][] = data.routes[0].geometry.coordinates.map(
            ([lng, lat]: [number, number]) => [lat, lng] as [number, number],
          );
          try {
            const entry: CacheEntry = { coords, ts: Date.now() };
            localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
          } catch {
            // localStorage quota exceeded — still use in memory
          }
          setRoute(coords);
          setSource('osrm');
          console.info(
            `[Hwy1Route] Loaded ${coords.length.toLocaleString()} road-snapped points from OSRM`,
          );
        } else {
          throw new Error('OSRM returned no route');
        }
      })
      .catch(err => {
        if (!cancelled) {
          console.warn('[Hwy1Route] OSRM fetch failed — using fallback coords:', err.message);
          setSource('fallback');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { route, loading, source };
}
