import { useState, useCallback, useMemo } from 'react';
import { POI, PlanSlot, DayPlan, TripPlan, PlannerConfig } from '../types';

const API_BASE = import.meta.env.VITE_API_URL ?? '';
const STORAGE_KEY = 'tg_plan_v1';

export type PlannerStatus = 'idle' | 'loading' | 'ready' | 'error';

// LA-area regions the planner cares about
const LA_REGIONS = new Set([
  'Santa Monica / LA',
  'Hollywood',
  'West Hollywood',
  'Downtown LA',
  'Arts District',
  'Los Feliz / Silver Lake',
  'Beverly Hills',
  'Malibu',
  'Los Angeles',
  // Day trips
  'Joshua Tree',
  'Palm Springs',
]);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate + 'T12:00:00');
  const end = new Date(endDate + 'T12:00:00');
  const cur = new Date(start);
  while (cur <= end) {
    dates.push(cur.toISOString().split('T')[0]);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

function nowHHMM(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function loadFromStorage(): TripPlan | null {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? (JSON.parse(s) as TripPlan) : null;
  } catch {
    return null;
  }
}

function saveToStorage(plan: TripPlan): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
  } catch {
    // storage quota or private mode
  }
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function usePlanner(allPois: POI[]) {
  const [plan, setPlanInner] = useState<TripPlan | null>(loadFromStorage);
  const [config, setConfig] = useState<PlannerConfig | null>(null);
  const [status, setStatus] = useState<PlannerStatus>(() =>
    loadFromStorage() ? 'ready' : 'idle'
  );
  const [error, setError] = useState<string | null>(null);
  const [isRescheduling, setIsRescheduling] = useState(false);

  // Filtered LA-area POIs (trimmed for the API payload)
  const laPois = useMemo(
    () =>
      allPois
        .filter((p) => LA_REGIONS.has(p.region))
        .map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          tier: p.tier,
          region: p.region,
          address: p.address ?? '',
          hours: p.hours ?? 'flexible',
          price: p.price ?? '?',
          bestTime: p.bestTime ?? '',
          lat: p.lat,
          lng: p.lng,
        })),
    [allPois]
  );

  // ── Internal setter that also persists ─────────────────────────────────────
  const setPlan = useCallback((p: TripPlan | null) => {
    setPlanInner(p);
    if (p) {
      saveToStorage(p);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // ── Generate ───────────────────────────────────────────────────────────────
  const generate = useCallback(
    async (cfg: PlannerConfig) => {
      setConfig(cfg);
      setStatus('loading');
      setError(null);

      const dates = generateDateRange(cfg.startDate, cfg.endDate);

      try {
        const resp = await fetch(`${API_BASE}/api/planner/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            zone: cfg.zone,
            dates,
            startHour: cfg.startHour,
            endHour: cfg.endHour,
            nightLife: cfg.nightLife,
            nightEndHour: cfg.nightEndHour,
            pois: laPois,
          }),
        });

        if (!resp.ok) {
          const body = await resp.json().catch(() => ({}));
          throw new Error((body as any).error || `Server error ${resp.status}`);
        }

        const data = (await resp.json()) as { days: DayPlan[] };

        const newPlan: TripPlan = {
          id: Date.now().toString(),
          zone: cfg.zone,
          days: data.days,
          createdAt: new Date().toISOString(),
          startHour: cfg.startHour,
          endHour: cfg.endHour,
          nightLife: cfg.nightLife,
          nightEndHour: cfg.nightEndHour,
        };

        setPlan(newPlan);
        setStatus('ready');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to generate plan';
        setError(msg);
        setStatus('error');
      }
    },
    [laPois, setPlan]
  );

  // ── Mark slot done (or undo) ───────────────────────────────────────────────
  const markDone = useCallback(
    (date: string, poiId: string, done: boolean) => {
      setPlanInner((prev) => {
        if (!prev) return prev;
        const updated: TripPlan = {
          ...prev,
          days: prev.days.map((day) =>
            day.date !== date
              ? day
              : {
                  ...day,
                  slots: day.slots.map((slot) =>
                    slot.poiId === poiId ? { ...slot, done } : slot
                  ),
                }
          ),
        };
        saveToStorage(updated);
        return updated;
      });
    },
    []
  );

  // ── Replan (call when behind schedule) ────────────────────────────────────
  const replan = useCallback(async () => {
    if (!plan) return;
    setIsRescheduling(true);

    const currentTime = nowHHMM();
    const currentDate = todayISO();

    const completed = plan.days
      .flatMap((d) => d.slots.filter((s) => s.done).map((s) => s.poiId));

    const remaining: DayPlan[] = plan.days
      .map((d) => ({ ...d, slots: d.slots.filter((s) => !s.done) }))
      .filter((d) => d.slots.length > 0);

    try {
      const resp = await fetch(`${API_BASE}/api/planner/replan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed, remaining, currentTime, currentDate }),
      });

      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error((body as any).error || `Server error ${resp.status}`);
      }

      const data = (await resp.json()) as { days: DayPlan[] };

      // Merge done slots (keep as-is) + replanned undone slots
      const doneSlotsMap = new Map<string, PlanSlot[]>(
        plan.days.map((d) => [d.date, d.slots.filter((s) => s.done)])
      );

      const allDates = [
        ...new Set([
          ...plan.days.map((d) => d.date),
          ...data.days.map((d) => d.date),
        ]),
      ].sort();

      const mergedDays: DayPlan[] = allDates.map((date) => {
        const origDay = plan.days.find((d) => d.date === date);
        const replanDay = data.days.find((d) => d.date === date);
        return {
          date,
          label: origDay?.label ?? replanDay?.label ?? date,
          slots: [
            ...(doneSlotsMap.get(date) ?? []),
            ...(replanDay?.slots ?? []),
          ],
        };
      });

      setPlan({ ...plan, days: mergedDays });
    } catch (err) {
      console.error('[usePlanner] replan failed:', err);
    } finally {
      setIsRescheduling(false);
    }
  }, [plan, setPlan]);

  // ── Clear plan ─────────────────────────────────────────────────────────────
  const clearPlan = useCallback(() => {
    setPlan(null);
    setStatus('idle');
    setError(null);
    setConfig(null);
  }, [setPlan]);

  // ── isBehindSchedule ──────────────────────────────────────────────────────
  const isBehindSchedule = useMemo(() => {
    if (!plan || status !== 'ready') return false;
    const today = todayISO();
    const todayPlan = plan.days.find((d) => d.date === today);
    if (!todayPlan) return false;
    const now = nowHHMM();
    return todayPlan.slots.some((s) => !s.done && s.endTime < now);
  }, [plan, status]);

  return {
    plan,
    config,
    status,
    error,
    isRescheduling,
    isBehindSchedule,
    laPoisCount: laPois.length,
    generate,
    markDone,
    replan,
    clearPlan,
  };
}
