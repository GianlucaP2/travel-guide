import { useState, useCallback, useMemo } from 'react';
import { POI, PlanSlot, DayPlan, TripPlan, PlannerConfig, BudgetLevel, Category } from '../types';

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

// Map a freeform price string to a numeric budget level (1–4)
function priceToBudget(price?: string): BudgetLevel {
  if (!price) return 2;
  const p = price.toLowerCase().trim();
  if (p === 'free' || p.startsWith('free')) return 1;
  // Count $ signs ($$$$=4, $$$=3, $$=2, $=1)
  const dollars = (price.match(/\$/g) || []).length;
  if (dollars >= 4) return 4;
  if (dollars >= 3) return 3;
  if (dollars >= 2) return 2;
  if (dollars >= 1) return 1;
  // Numeric dollar amounts like '$30/person', '$15 adults'
  const match = p.match(/\$(\d+)/);
  if (match) {
    const amt = parseInt(match[1]);
    if (amt <= 20) return 1;
    if (amt <= 60) return 2;
    if (amt <= 150) return 3;
    return 4;
  }
  return 1;
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
  const [swappingSlotId, setSwappingSlotId] = useState<string | null>(null);

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
        // Filter POIs: tier 0 (iconic) always included; others filtered by category + budget
        const filteredPois = laPois.filter((p) => {
          if (p.tier === 0) return true; // iconic must-sees always in
          if (!cfg.categories.includes(p.category as Category)) return false;
          if (priceToBudget(p.price) > cfg.budgetLevel) return false;
          return true;
        });

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
            categories: cfg.categories,
            budgetLevel: cfg.budgetLevel,
            pois: filteredPois,
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
          categories: cfg.categories,
          budgetLevel: cfg.budgetLevel,
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

  // ── Swap a single slot ────────────────────────────────────────────────────
  const swapSlot = useCallback(
    async (date: string, poiId: string, prompt: string) => {
      if (!plan) return;
      setSwappingSlotId(poiId);

      const day = plan.days.find((d) => d.date === date);
      const slot = day?.slots.find((s) => s.poiId === poiId);
      if (!day || !slot) { setSwappingSlotId(null); return; }

      // Direct pick (no AI): prompt = "__direct__:pickedId:pickedName:startTime:endTime"
      if (prompt.startsWith('__direct__:')) {
        const parts = prompt.split(':');
        // parts: ['__direct__', pickedId, pickedName, startTime, endTime]
        // Note: name may contain colons, so join remaining after index 4
        const [, pickedId, ...rest] = parts;
        const endTime = rest.pop()!;
        const startTime = rest.pop()!;
        const pickedName = rest.join(':');
        setPlanInner((prev) => {
          if (!prev) return prev;
          const updated: TripPlan = {
            ...prev,
            days: prev.days.map((d) =>
              d.date !== date
                ? d
                : {
                    ...d,
                    slots: d.slots.map((s) =>
                      s.poiId === poiId
                        ? { poiId: pickedId, poiName: pickedName, startTime, endTime, notes: '', done: false }
                        : s
                    ),
                  }
            ),
          };
          saveToStorage(updated);
          return updated;
        });
        setSwappingSlotId(null);
        return;
      }

      // Build candidate pool: all laPois not already on this day
      const usedIds = new Set(day.slots.map((s) => s.poiId));
      const candidates = laPois.filter((p) => !usedIds.has(p.id));

      try {
        const resp = await fetch(`${API_BASE}/api/planner/swap`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slot,
            date,
            daySlots: day.slots,
            prompt,
            pois: candidates,
          }),
        });
        if (!resp.ok) {
          const body = await resp.json().catch(() => ({}));
          throw new Error((body as any).error || `Server error ${resp.status}`);
        }
        const data = (await resp.json()) as { slot: PlanSlot };
        setPlanInner((prev) => {
          if (!prev) return prev;
          const updated: TripPlan = {
            ...prev,
            days: prev.days.map((d) =>
              d.date !== date
                ? d
                : { ...d, slots: d.slots.map((s) => (s.poiId === poiId ? { ...data.slot, done: false } : s)) }
            ),
          };
          saveToStorage(updated);
          return updated;
        });
      } catch (err) {
        console.error('[usePlanner] swapSlot failed:', err);
        throw err;
      } finally {
        setSwappingSlotId(null);
      }
    },
    [plan, laPois, setPlanInner]
  );

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
    swappingSlotId,
    isBehindSchedule,
    laPoisCount: laPois.length,
    laPois,
    generate,
    markDone,
    replan,
    swapSlot,
    clearPlan,
  };
}
