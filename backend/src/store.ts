/**
 * Simple JSON-file store for user profiles and saved plans.
 * DATA_DIR env var (default: ./data in dev, /data in production/k8s).
 */
import fs from 'fs';
import path from 'path';

const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), 'data');
const PROFILES_FILE = path.join(DATA_DIR, 'profiles.json');
const PLANS_FILE    = path.join(DATA_DIR, 'plans.json');

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StoredProfile {
  id: string;
  name: string;
  interests: string[];   // Category ids
  budgetLevel: number;   // 1–4
  createdAt: string;
  updatedAt: string;
}

export interface StoredPlan {
  id: string;
  profileId: string;
  label: string;           // e.g. "LA Trip — Apr 2026"
  planData: string;        // JSON-stringified TripPlan
  createdAt: string;
  updatedAt: string;
}

// ─── In-memory cache ─────────────────────────────────────────────────────────

let profiles: Record<string, StoredProfile> = {};
let plans: Record<string, StoredPlan> = {};
let loaded = false;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ensureDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function load(): void {
  if (loaded) return;
  ensureDir();
  try {
    if (fs.existsSync(PROFILES_FILE)) {
      profiles = JSON.parse(fs.readFileSync(PROFILES_FILE, 'utf-8')) as Record<string, StoredProfile>;
    }
  } catch {
    profiles = {};
  }
  try {
    if (fs.existsSync(PLANS_FILE)) {
      plans = JSON.parse(fs.readFileSync(PLANS_FILE, 'utf-8')) as Record<string, StoredPlan>;
    }
  } catch {
    plans = {};
  }
  loaded = true;
}

function flushProfiles(): void {
  ensureDir();
  fs.writeFileSync(PROFILES_FILE, JSON.stringify(profiles, null, 2), 'utf-8');
}

function flushPlans(): void {
  ensureDir();
  fs.writeFileSync(PLANS_FILE, JSON.stringify(plans, null, 2), 'utf-8');
}

// ─── Store API ────────────────────────────────────────────────────────────────

export const store = {
  // ── Profiles ────────────────────────────────────────────────────────────────

  getProfile(id: string): StoredProfile | null {
    load();
    return profiles[id] ?? null;
  },

  upsertProfile(profile: StoredProfile): StoredProfile {
    load();
    profiles[profile.id] = profile;
    flushProfiles();
    return profile;
  },

  deleteProfile(id: string): boolean {
    load();
    if (!profiles[id]) return false;
    delete profiles[id];
    // Remove all plans for this profile
    for (const pid of Object.keys(plans)) {
      if (plans[pid].profileId === id) delete plans[pid];
    }
    flushProfiles();
    flushPlans();
    return true;
  },

  // ── Plans ────────────────────────────────────────────────────────────────────

  getPlansForProfile(profileId: string): StoredPlan[] {
    load();
    return Object.values(plans)
      .filter((p) => p.profileId === profileId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  getPlan(id: string): StoredPlan | null {
    load();
    return plans[id] ?? null;
  },

  upsertPlan(plan: StoredPlan): StoredPlan {
    load();
    plans[plan.id] = plan;
    flushPlans();
    return plan;
  },

  deletePlan(id: string): boolean {
    load();
    if (!plans[id]) return false;
    delete plans[id];
    flushPlans();
    return true;
  },
};
