import React, { useState, useEffect } from 'react';
import { UserProfile, SavedPlan, TripPlan, BudgetLevel } from '../types';
import { UseProfile } from '../hooks/useProfile';

// ─── Shared with PlannerPanel constants ──────────────────────────────────────

const INTEREST_GROUPS = [
  { id: 'nature',    emoji: '🌿', label: 'Nature',       categories: ['nature', 'beach', 'viewpoint', 'camping'] },
  { id: 'food',      emoji: '🍽️', label: 'Food',         categories: ['restaurant'] },
  { id: 'bars',      emoji: '🍸', label: 'Bars',         categories: ['bar'] },
  { id: 'city',      emoji: '🏙️', label: 'City Life',    categories: ['landmark', 'experience', 'shopping'] },
  { id: 'museums',   emoji: '🏛️', label: 'Museums',      categories: ['museum'] },
];

const BUDGET_OPTIONS: { level: BudgetLevel; emoji: string; label: string; sublabel: string }[] = [
  { level: 1, emoji: '🌱', label: 'Thrifty',     sublabel: 'Free / $'  },
  { level: 2, emoji: '💰', label: 'Moderate',    sublabel: '$$'         },
  { level: 3, emoji: '✨', label: 'Comfortable', sublabel: '$$$'        },
  { level: 4, emoji: '💎', label: 'Luxury',      sublabel: '$$$$'       },
];

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  profileHook: UseProfile;
  onClose: () => void;
  onLoadPlan: (plan: TripPlan) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ProfileModal({ profileHook, onClose, onLoadPlan }: Props) {
  const { profile, savedPlans, isSaving, isLoading, saveProfile, deletePlan, refreshPlans } = profileHook;

  const [tab, setTab] = useState<'profile' | 'plans'>('profile');
  const [name, setName] = useState(profile?.name ?? '');
  const [interests, setInterests] = useState<Set<string>>(
    new Set(profile?.interests ?? ['nature', 'food', 'bars', 'city'])
  );
  const [budget, setBudget] = useState<BudgetLevel>(profile?.budgetLevel ?? 2);
  const [saved, setSaved] = useState(false);

  // Sync form when profile loads from backend
  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setInterests(new Set(profile.interests));
      setBudget(profile.budgetLevel as BudgetLevel);
    }
  }, [profile]);

  // Load plans on mount
  useEffect(() => { refreshPlans(); }, [refreshPlans]);

  const handleSave = async () => {
    if (!name.trim()) return;
    await saveProfile({ name: name.trim(), interests: [...interests], budgetLevel: budget });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLoadPlan = (sp: SavedPlan) => {
    try {
      const plan = JSON.parse(sp.planData) as TripPlan;
      onLoadPlan(plan);
      onClose();
    } catch {
      alert('Could not load plan — data may be corrupted.');
    }
  };

  const toggleInterest = (id: string) => {
    setInterests((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const initial = name.trim() ? name.trim()[0].toUpperCase() : '?';

  return (
    <div
      className="fixed inset-0 z-[4000] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-sm glass border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-ocean-500/30 border border-ocean-400/40 flex items-center justify-center text-sm font-bold text-ocean-300">
            {initial}
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-bold text-white">{profile?.name || 'My Profile'}</h2>
            <p className="text-[11px] text-gray-500">Saved plans &amp; preferences</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 flex-shrink-0">
          {(['profile', 'plans'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
                tab === t ? 'text-ocean-400 border-b-2 border-ocean-400' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {t === 'profile' ? '👤 Profile' : `📋 Saved Plans (${savedPlans.length})`}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* ── Profile tab ──────────────────────────────────────────── */}
          {tab === 'profile' && (
            <div className="p-4 space-y-5">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-400">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:border-ocean-400 focus:outline-none transition-colors"
                />
              </div>

              {/* Interests */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-400">Travel interests</label>
                <div className="flex flex-wrap gap-2">
                  {INTEREST_GROUPS.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => toggleInterest(g.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        interests.has(g.id)
                          ? 'bg-ocean-500/20 border-ocean-400/50 text-ocean-300'
                          : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                      }`}
                    >
                      {g.emoji} {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Budget */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-400">Default budget</label>
                <div className="grid grid-cols-4 gap-2">
                  {BUDGET_OPTIONS.map((b) => (
                    <button
                      key={b.level}
                      onClick={() => setBudget(b.level)}
                      className={`flex flex-col items-center py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                        budget === b.level
                          ? 'bg-ocean-500/15 border-ocean-400/50 text-ocean-300'
                          : 'bg-white/3 border-white/8 text-gray-500 hover:border-white/15'
                      }`}
                    >
                      <span className="text-base mb-0.5">{b.emoji}</span>
                      <span>{b.label}</span>
                      <span className="text-[10px] font-normal opacity-70">{b.sublabel}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Save button */}
              <button
                onClick={handleSave}
                disabled={isSaving || !name.trim()}
                className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${
                  saved
                    ? 'bg-green-500/20 border border-green-500/40 text-green-400'
                    : 'bg-ocean-500 hover:bg-ocean-400 text-white disabled:opacity-40'
                }`}
              >
                {saved ? '✓ Saved!' : isSaving ? '…' : 'Save Profile'}
              </button>
            </div>
          )}

          {/* ── Plans tab ────────────────────────────────────────────── */}
          {tab === 'plans' && (
            <div className="p-4 space-y-2">
              {isLoading && (
                <p className="text-xs text-gray-500 text-center py-4 animate-pulse">Loading plans…</p>
              )}
              {!isLoading && savedPlans.length === 0 && (
                <div className="text-center py-8 space-y-2">
                  <p className="text-2xl">🗺️</p>
                  <p className="text-xs text-gray-500">No saved plans yet.</p>
                  <p className="text-[11px] text-gray-600">Generate a plan and save it using the 💾 button in the planner.</p>
                </div>
              )}
              {savedPlans.map((sp) => {
                const updatedAt = new Date(sp.updatedAt).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                });
                let dayCount = 0;
                try { dayCount = (JSON.parse(sp.planData) as TripPlan).days.length; } catch { /* ignore */ }

                return (
                  <div
                    key={sp.id}
                    className="flex items-start gap-3 p-3 rounded-xl bg-white/3 border border-white/8 hover:border-white/12 transition-all"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{sp.label}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {dayCount > 0 ? `${dayCount} day${dayCount !== 1 ? 's' : ''} · ` : ''}Updated {updatedAt}
                      </p>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => handleLoadPlan(sp)}
                        className="px-3 py-1.5 rounded-lg bg-ocean-500/15 border border-ocean-400/30 text-ocean-300 text-xs font-semibold hover:bg-ocean-500/25 transition-all"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => deletePlan(sp.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-all text-xs"
                        title="Delete plan"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
