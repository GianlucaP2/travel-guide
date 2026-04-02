import { useState, useCallback, useEffect } from 'react';
import { UserProfile, SavedPlan, TripPlan, Category, BudgetLevel } from '../types';

const API_BASE = import.meta.env.VITE_API_URL ?? '';
const PROFILE_ID_KEY = 'tg_profile_id';
const PROFILE_KEY    = 'tg_profile_v1';

function uuid(): string {
  return crypto.randomUUID();
}

function loadLocalProfile(): UserProfile | null {
  try {
    const s = localStorage.getItem(PROFILE_KEY);
    return s ? (JSON.parse(s) as UserProfile) : null;
  } catch { return null; }
}

function saveLocalProfile(p: UserProfile): void {
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

function getOrCreateId(): string {
  let id = localStorage.getItem(PROFILE_ID_KEY);
  if (!id) { id = uuid(); localStorage.setItem(PROFILE_ID_KEY, id); }
  return id;
}

export interface UseProfile {
  profile: UserProfile | null;
  savedPlans: SavedPlan[];
  isSaving: boolean;
  isLoading: boolean;
  /** Create or update the profile (persists locally + to backend) */
  saveProfile: (updates: { name: string; interests: string[]; budgetLevel: BudgetLevel }) => Promise<void>;
  /** Save current trip plan to the profile */
  savePlan: (plan: TripPlan) => Promise<SavedPlan>;
  /** Update an existing saved plan (e.g. after editing) */
  updatePlan: (planId: string, plan: TripPlan) => Promise<void>;
  /** Delete a saved plan */
  deletePlan: (planId: string) => Promise<void>;
  /** Load saved plans list from backend */
  refreshPlans: () => Promise<void>;
}

/**
 * Manages the user profile and saved plans.
 * Primary storage: backend JSON store.
 * Fallback / cache: localStorage (profile data only).
 */
export function useProfile(): UseProfile {
  const profileId = getOrCreateId();

  const [profile, setProfile] = useState<UserProfile | null>(loadLocalProfile);
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch profile + plans from backend once on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch(`${API_BASE}/api/profiles/${profileId}`);
        if (resp.ok && !cancelled) {
          const p = (await resp.json()) as UserProfile;
          setProfile(p);
          saveLocalProfile(p);
        }
      } catch { /* offline / backend unreachable — use localStorage */ }

      try {
        const resp = await fetch(`${API_BASE}/api/profiles/${profileId}/plans`);
        if (resp.ok && !cancelled) {
          setSavedPlans((await resp.json()) as SavedPlan[]);
        }
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [profileId]);

  const saveProfile = useCallback(
    async (updates: { name: string; interests: string[]; budgetLevel: BudgetLevel }) => {
      setIsSaving(true);
      const now = new Date().toISOString();
      const next: UserProfile = {
        id: profileId,
        name: updates.name,
        interests: updates.interests,
        budgetLevel: updates.budgetLevel,
        createdAt: profile?.createdAt ?? now,
        updatedAt: now,
      };
      try {
        const resp = await fetch(`${API_BASE}/api/profiles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(next),
        });
        if (resp.ok) {
          const saved = (await resp.json()) as UserProfile;
          setProfile(saved);
          saveLocalProfile(saved);
        } else {
          // Backend unreachable — save locally only
          setProfile(next);
          saveLocalProfile(next);
        }
      } catch {
        setProfile(next);
        saveLocalProfile(next);
      } finally {
        setIsSaving(false);
      }
    },
    [profile, profileId]
  );

  const refreshPlans = useCallback(async () => {
    setIsLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/api/profiles/${profileId}/plans`);
      if (resp.ok) setSavedPlans((await resp.json()) as SavedPlan[]);
    } catch { /* ignore */ }
    finally { setIsLoading(false); }
  }, [profileId]);

  const savePlan = useCallback(
    async (plan: TripPlan): Promise<SavedPlan> => {
      setIsSaving(true);
      // Auto-generate a label from the plan
      const firstDate = plan.days[0]?.date ?? '';
      const lastDate  = plan.days[plan.days.length - 1]?.date ?? '';
      const fmt = (d: string) =>
        d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
      const label = `${plan.zone} · ${fmt(firstDate)}${lastDate !== firstDate ? ` – ${fmt(lastDate)}` : ''}`;

      const payload = {
        id: plan.id,
        profileId,
        label,
        planData: JSON.stringify(plan),
      };
      try {
        const resp = await fetch(`${API_BASE}/api/profiles/${profileId}/plans`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const saved = resp.ok ? ((await resp.json()) as SavedPlan) : ({ ...payload, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as SavedPlan);
        setSavedPlans((prev) => {
          const without = prev.filter((p) => p.id !== saved.id);
          return [saved, ...without];
        });
        return saved;
      } finally {
        setIsSaving(false);
      }
    },
    [profileId]
  );

  const updatePlan = useCallback(
    async (planId: string, plan: TripPlan) => {
      try {
        await fetch(`${API_BASE}/api/profiles/${profileId}/plans/${planId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planData: JSON.stringify(plan) }),
        });
        setSavedPlans((prev) =>
          prev.map((p) =>
            p.id === planId ? { ...p, planData: JSON.stringify(plan), updatedAt: new Date().toISOString() } : p
          )
        );
      } catch { /* ignore */ }
    },
    [profileId]
  );

  const deletePlan = useCallback(
    async (planId: string) => {
      setSavedPlans((prev) => prev.filter((p) => p.id !== planId));
      try {
        await fetch(`${API_BASE}/api/profiles/${profileId}/plans/${planId}`, { method: 'DELETE' });
      } catch { /* ignore */ }
    },
    [profileId]
  );

  return { profile, savedPlans, isSaving, isLoading, saveProfile, savePlan, updatePlan, deletePlan, refreshPlans };
}
