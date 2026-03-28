/**
 * useProximityNotifications — unit tests
 *
 * Strategy: the hook's pure logic lives in constants + helper functions inside
 * the module. We test each concern in isolation by either:
 *   (a) re-implementing the same formula and asserting the hook's observable
 *       side-effects (notifications fired, Maps URL shape), or
 *   (b) testing the pure maths directly here.
 *
 * Browser globals (Notification, window.open) are fully mocked via vitest.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProximityNotifications } from '../hooks/useProximityNotifications';
import type { POI, GPSState } from '../types';

// ─── Constants mirrored from the hook (single source of truth for tests) ─────
const ALERT_MINUTES   = 10;
const FALLBACK_KMH    = 80;
const MIN_RADIUS_M    = 3_000;
const MAX_RADIUS_M    = 25_000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Same Haversine formula used in the hook. */
function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
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

function alertRadius(speedMps: number) {
  return Math.max(MIN_RADIUS_M, Math.min(MAX_RADIUS_M, speedMps * ALERT_MINUTES * 60));
}

/** Build a minimal POI at the given coordinates. */
function makePOI(lat: number, lng: number, overrides: Partial<POI> = {}): POI {
  return {
    id: 'poi-1',
    name: 'Test Attraction',
    category: 'nature',
    region: 'San Francisco',
    lat,
    lng,
    tier: 1,
    description: '',
    tags: [],
    ...overrides,
  };
}

/** Build a GPS state positioned at the given coordinates. */
function makeGPS(lat: number, lng: number, speedMps: number | null = null): GPSState {
  return {
    tracking: true,
    lat,
    lng,
    speed: speedMps,
    heading: null,
    accuracy: 10,
    timestamp: Date.now(),
    error: null,
    following: false,
  };
}

// ─── Mock setup ───────────────────────────────────────────────────────────────

type MockNotifInstance = {
  body: string;
  tag: string;
  requireInteraction: boolean;
  onclick: (() => void) | null;
  close: ReturnType<typeof vi.fn>;
};

let mockNotificationInstances: MockNotifInstance[] = [];

beforeEach(() => {
  mockNotificationInstances = [];

  // Notification must be a real class so `new Notification(...)` works.
  class MockNotification {
    body: string;
    tag: string;
    requireInteraction: boolean;
    onclick: (() => void) | null = null;
    close = vi.fn();

    static permission: NotificationPermission = 'granted';
    static requestPermission = vi.fn().mockResolvedValue('granted' as NotificationPermission);

    constructor(_title: string, opts: NotificationOptions) {
      this.body = opts.body as string;
      this.tag = opts.tag as string;
      this.requireInteraction = !!opts.requireInteraction;
      mockNotificationInstances.push(this);
    }
  }

  Object.defineProperty(globalThis, 'Notification', {
    value: MockNotification,
    writable: true,
    configurable: true,
  });

  vi.spyOn(window, 'open').mockImplementation(() => null);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('Haversine distance formula', () => {
  it('returns ~0 for identical coordinates', () => {
    expect(haversineMeters(37.8, -122.4, 37.8, -122.4)).toBeCloseTo(0, 0);
  });

  it('returns ~111 km per degree of latitude', () => {
    const dist = haversineMeters(0, 0, 1, 0);
    expect(dist).toBeGreaterThan(110_000);
    expect(dist).toBeLessThan(112_000);
  });

  it('is symmetric (A→B == B→A)', () => {
    const ab = haversineMeters(37.7, -122.4, 34.05, -118.24);
    const ba = haversineMeters(34.05, -118.24, 37.7, -122.4);
    expect(ab).toBeCloseTo(ba, 0);
  });

  it('returns ~559 km for SF → LA', () => {
    const dist = haversineMeters(37.774, -122.419, 34.052, -118.244);
    expect(dist).toBeGreaterThan(550_000);
    expect(dist).toBeLessThan(570_000);
  });
});

describe('Alert radius calculation', () => {
  it('uses fallback 80 km/h when speed is null → ~13.3 km', () => {
    const speedMps = FALLBACK_KMH / 3.6;
    const r = alertRadius(speedMps);
    expect(r).toBeCloseTo(speedMps * ALERT_MINUTES * 60, -2);
    expect(r).toBeGreaterThan(MIN_RADIUS_M);
    expect(r).toBeLessThan(MAX_RADIUS_M);
  });

  it('clamps to MIN_RADIUS_M (3 km) when speed is very low', () => {
    expect(alertRadius(0.1)).toBe(MIN_RADIUS_M);   // ~0.1 m/s ≈ stationary
    expect(alertRadius(1)).toBe(MIN_RADIUS_M);      // 3.6 km/h walking pace
  });

  it('clamps to MAX_RADIUS_M (25 km) when speed is very high', () => {
    expect(alertRadius(1000)).toBe(MAX_RADIUS_M);   // unrealistic speed
  });

  it('at 100 km/h the radius is ~16.7 km', () => {
    const speedMps = 100 / 3.6;
    const r = alertRadius(speedMps);
    expect(r).toBeCloseTo(16_667, -2);
  });

  it('at 50 km/h the radius is ~8.3 km', () => {
    const speedMps = 50 / 3.6;
    const r = alertRadius(speedMps);
    expect(r).toBeCloseTo(8_333, -2);
  });
});

describe('useProximityNotifications — notification firing', () => {
  it('fires a notification when a POI is within the alert radius', () => {
    // Place user and POI 500 m apart — well within the 3 km floor
    const userLat = 37.774;
    const userLng = -122.419;
    const poi = makePOI(37.778, -122.419);   // ~445 m north
    const gps = makeGPS(userLat, userLng, null);

    renderHook(() => useProximityNotifications([poi], gps));

    expect(mockNotificationInstances).toHaveLength(1);
    expect(mockNotificationInstances[0].tag).toBe('proximity-poi-1');
  });

  it('does NOT fire when the POI is beyond the alert radius', () => {
    // User doing 5 km/h (clamped to 3 km floor) — POI is 10 km away
    const userLat = 37.774;
    const userLng = -122.419;
    const poi = makePOI(37.864, -122.419);   // ~10 km north
    const gps = makeGPS(userLat, userLng, 5 / 3.6);   // 5 km/h → radius = 3 km

    renderHook(() => useProximityNotifications([poi], gps));

    expect(mockNotificationInstances).toHaveLength(0);
  });

  it('does NOT fire twice for the same POI', () => {
    const poi = makePOI(37.774, -122.419);
    const gps = makeGPS(37.774, -122.419, null);

    const { rerender } = renderHook(
      ({ g }: { g: GPSState }) => useProximityNotifications([poi], g),
      { initialProps: { g: gps } },
    );

    // Trigger a second position update (same location)
    rerender({ g: { ...gps, accuracy: 8 } });

    expect(mockNotificationInstances).toHaveLength(1);
  });

  it('fires requireInteraction=true for Tier 1 and 2, false for Tier 3+', () => {
    const baseLat = 37.774, baseLng = -122.419;
    const gps = makeGPS(baseLat, baseLng, null);

    const tier1 = makePOI(baseLat, baseLng, { id: 't1', tier: 1 });
    const tier2 = makePOI(baseLat, baseLng, { id: 't2', tier: 2 });
    const tier3 = makePOI(baseLat, baseLng, { id: 't3', tier: 3 });
    const tier4 = makePOI(baseLat, baseLng, { id: 't4', tier: 4 });

    renderHook(() => useProximityNotifications([tier1, tier2, tier3, tier4], gps));

    expect(mockNotificationInstances).toHaveLength(4);
    const byTag = Object.fromEntries(mockNotificationInstances.map(n => [n.tag, n]));
    expect(byTag['proximity-t1'].requireInteraction).toBe(true);
    expect(byTag['proximity-t2'].requireInteraction).toBe(true);
    expect(byTag['proximity-t3'].requireInteraction).toBe(false);
    expect(byTag['proximity-t4'].requireInteraction).toBe(false);
  });

  it('does NOT fire when GPS tracking is off', () => {
    const poi = makePOI(37.774, -122.419);
    const gps: GPSState = { ...makeGPS(37.774, -122.419), tracking: false };

    renderHook(() => useProximityNotifications([poi], gps));

    expect(mockNotificationInstances).toHaveLength(0);
  });
});

describe('useProximityNotifications — Maps URL on click', () => {
  it('opens a Google Maps navigation URL with origin, destination and dir_action=navigate', () => {
    const userLat = 37.774, userLng = -122.419;
    const poiLat  = 37.775, poiLng  = -122.419;
    const poi = makePOI(poiLat, poiLng);
    const gps = makeGPS(userLat, userLng, null);

    renderHook(() => useProximityNotifications([poi], gps));
    expect(mockNotificationInstances).toHaveLength(1);

    // Simulate the user tapping the notification
    act(() => {
      mockNotificationInstances[0].onclick?.();
    });

    expect(window.open).toHaveBeenCalledOnce();
    const url = new URL((window.open as ReturnType<typeof vi.spyOn>).mock.calls[0][0] as string);

    expect(url.hostname).toBe('www.google.com');
    expect(url.pathname).toBe('/maps/dir/');
    expect(url.searchParams.get('travelmode')).toBe('driving');
    expect(url.searchParams.get('dir_action')).toBe('navigate');
    expect(url.searchParams.get('origin')).toBe(`${userLat},${userLng}`);
    expect(url.searchParams.get('destination')).toBe(`${poiLat},${poiLng}`);
  });

  it('includes the exact POI coordinates in the destination param', () => {
    const poi = makePOI(34.0522, -118.2437, { id: 'la' });
    // Place the user 500 m away from the POI so it falls within the alert radius
    const gps = makeGPS(34.0522, -118.2380, null);

    renderHook(() => useProximityNotifications([poi], gps));
    act(() => { mockNotificationInstances[0].onclick?.(); });

    const url = new URL((window.open as ReturnType<typeof vi.spyOn>).mock.calls[0][0] as string);
    expect(url.searchParams.get('destination')).toBe('34.0522,-118.2437');
  });
});

describe('useProximityNotifications — notification body text', () => {
  it('body starts with ~N min ahead', () => {
    const poi = makePOI(37.774, -122.419);
    const gps = makeGPS(37.774, -122.419, null);   // 0 distance → 1 min floor

    renderHook(() => useProximityNotifications([poi], gps));
    expect(mockNotificationInstances[0].body).toMatch(/^~\d+ min ahead/);
  });

  it('body includes Tier label for tier-1', () => {
    const poi = makePOI(37.774, -122.419, { tier: 1 });
    const gps = makeGPS(37.774, -122.419, null);

    renderHook(() => useProximityNotifications([poi], gps));
    expect(mockNotificationInstances[0].body).toContain('Must-See');
  });

  it('body prompts to start navigation', () => {
    const poi = makePOI(37.774, -122.419);
    const gps = makeGPS(37.774, -122.419, null);

    renderHook(() => useProximityNotifications([poi], gps));
    expect(mockNotificationInstances[0].body).toContain('Tap to start navigation');
  });
});
