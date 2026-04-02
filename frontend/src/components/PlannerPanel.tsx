import React, { useState, useEffect } from 'react';
import { POI, PlannerConfig } from '../types';
import { usePlanner } from '../hooks/usePlanner';

// ─── Constants ────────────────────────────────────────────────────────────────
const LA_ZONES = [
  'Beverly Hills',
  'West Hollywood',
  'Hollywood',
  'Santa Monica / LA',
  'Downtown LA',
  'Los Feliz / Silver Lake',
];

const HOUR_OPTIONS = Array.from({ length: 18 }, (_, i) => {
  const h = i + 6; // 06:00 → 23:00
  return `${String(h).padStart(2, '0')}:00`;
});

const NIGHT_HOUR_OPTIONS: { value: string; label: string }[] = [
  { value: '22:00', label: '10:00 PM' },
  { value: '23:00', label: '11:00 PM' },
  { value: '00:00', label: 'Midnight' },
  { value: '01:00', label: '1:00 AM' },
  { value: '02:00', label: '2:00 AM' },
];

const CATEGORY_EMOJI: Record<string, string> = {
  restaurant: '🍽️',
  bar: '🍸',
  landmark: '🏛️',
  nature: '🌿',
  viewpoint: '🔭',
  experience: '🎭',
  beach: '🏖️',
  shopping: '🛍️',
  accommodation: '🛏️',
  camping: '⛺',
};

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  pois: POI[];
  onClose: () => void;
  onSelectPOI?: (poi: POI) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function PlannerPanel({ pois, onClose, onSelectPOI }: Props) {
  const {
    plan,
    status,
    error,
    isRescheduling,
    isBehindSchedule,
    laPoisCount,
    generate,
    markDone,
    replan,
    clearPlan,
  } = usePlanner(pois);

  // ── Config form state ──────────────────────────────────────────────────────
  const today = new Date();
  const defaultStart = formatDate(today);
  const defaultEnd = formatDate(new Date(today.getTime() + 3 * 86400000));

  const [zone, setZone] = useState(LA_ZONES[0]);
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [startHour, setStartHour] = useState('09:00');
  const [endHour, setEndHour] = useState('21:00');
  const [nightLife, setNightLife] = useState(true);
  const [nightEndHour, setNightEndHour] = useState('00:00');

  // ── Expanded day ───────────────────────────────────────────────────────────
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  // Auto-expand first day when plan is ready
  useEffect(() => {
    if (status === 'ready' && plan && plan.days.length > 0 && !expandedDay) {
      setExpandedDay(plan.days[0].date);
    }
  }, [status, plan]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleGenerate = () => {
    const cfg: PlannerConfig = { zone, startDate, endDate, startHour, endHour, nightLife, nightEndHour };
    generate(cfg);
  };

  const handleViewOnMap = (poiId: string) => {
    if (!onSelectPOI) return;
    const poi = pois.find((p) => p.id === poiId);
    if (poi) {
      onSelectPOI(poi);
      onClose();
    }
  };

  // ── Progress counters ──────────────────────────────────────────────────────
  const totalSlots = plan?.days.reduce((n, d) => n + d.slots.length, 0) ?? 0;
  const doneSlots = plan?.days.reduce((n, d) => n + d.slots.filter((s) => s.done).length, 0) ?? 0;
  const progressPct = totalSlots > 0 ? Math.round((doneSlots / totalSlots) * 100) : 0;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full glass border-l border-white/10 bg-dark-500/95 backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 flex-shrink-0">
        <span className="text-xl">🗓️</span>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold text-white tracking-wide">AI Trip Planner</h2>
          <p className="text-[11px] text-gray-500">Powered by GPT-4o</p>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all"
        >
          ✕
        </button>
      </div>

      {/* ── Setup view ─────────────────────────────────────────────────────── */}
      {(status === 'idle' || status === 'error') && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Intro */}
          <div className="glass border border-ocean-400/20 rounded-xl p-3 text-xs text-gray-300 leading-relaxed">
            Tell GPT-4o where you're staying and your schedule — it'll build a
            day-by-day LA itinerary from {laPoisCount} curated spots.
          </div>

          {/* Zone */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              🏨 Staying in
            </label>
            <select
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:border-ocean-400 focus:outline-none transition-colors"
            >
              {LA_ZONES.map((z) => (
                <option key={z} value={z} className="bg-gray-900">
                  {z}
                </option>
              ))}
            </select>
          </div>

          {/* Dates */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              📅 Dates
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] text-gray-500 mb-1">From</p>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:border-ocean-400 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <p className="text-[10px] text-gray-500 mb-1">To</p>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:border-ocean-400 focus:outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Hours */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              ⏰ Daily Hours
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] text-gray-500 mb-1">Start</p>
                <select
                  value={startHour}
                  onChange={(e) => setStartHour(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:border-ocean-400 focus:outline-none transition-colors"
                >
                  {HOUR_OPTIONS.map((h) => (
                    <option key={h} value={h} className="bg-gray-900">
                      {h}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 mb-1">End</p>
                <select
                  value={endHour}
                  onChange={(e) => setEndHour(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:border-ocean-400 focus:outline-none transition-colors"
                >
                  {HOUR_OPTIONS.filter((h) => h > startHour).map((h) => (
                    <option key={h} value={h} className="bg-gray-900">
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Error */}
          {status === 'error' && error && (
            <div className="glass border border-red-500/30 rounded-xl p-3 text-xs text-red-400">
              ⚠️ {error}
            </div>
          )}

          {/* Night Planning Toggle */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                🌙 Night Planning
              </label>
              <button
                type="button"
                onClick={() => setNightLife((v) => !v)}
                className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${
                  nightLife ? 'bg-indigo-500' : 'bg-white/10'
                }`}
                aria-label={nightLife ? 'Disable night planning' : 'Enable night planning'}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${
                    nightLife ? 'left-5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
            {nightLife && (
              <div className="glass border border-indigo-500/20 rounded-xl p-3 space-y-2.5">
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  🍽️ Dinner + 🍸 bar/rooftop tour planned each evening
                </p>
                <div>
                  <p className="text-[10px] text-gray-500 mb-1">Night ends at</p>
                  <select
                    value={nightEndHour}
                    onChange={(e) => setNightEndHour(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none transition-colors"
                  >
                    {NIGHT_HOUR_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value} className="bg-gray-900">
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            {!nightLife && (
              <p className="text-[11px] text-gray-500 pl-1">Daytime itinerary only</p>
            )}
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={!startDate || !endDate || startDate > endDate}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all
              bg-gradient-to-r from-ocean-500 to-blue-600 text-white
              hover:from-ocean-400 hover:to-blue-500 active:scale-[0.98]
              disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ✨ Generate My LA Plan
          </button>
        </div>
      )}

      {/* ── Loading view ───────────────────────────────────────────────────── */}
      {status === 'loading' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 rounded-full border-4 border-ocean-400/20" />
            <div className="absolute inset-0 rounded-full border-4 border-t-ocean-400 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center text-2xl">
              🤖
            </div>
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-semibold text-white">Planning your LA trip…</p>
            <p className="text-xs text-gray-500">GPT-4o is searching the web &amp; building your itinerary</p>
          </div>
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-ocean-400 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Plan view ──────────────────────────────────────────────────────── */}
      {status === 'ready' && plan && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Plan meta + progress */}
          <div className="px-4 py-3 border-b border-white/10 flex-shrink-0 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-white">{plan.zone}</p>
                <p className="text-[11px] text-gray-500">
                  {plan.days.length} day{plan.days.length !== 1 ? 's' : ''} ·{' '}
                  {doneSlots}/{totalSlots} completed
                </p>
              </div>
              <button
                onClick={clearPlan}
                className="text-[11px] text-gray-500 hover:text-red-400 transition-colors px-2 py-1 rounded"
              >
                New Plan
              </button>
            </div>
            {/* Progress bar */}
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-ocean-500 to-green-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            {/* Behind schedule banner */}
            {isBehindSchedule && (
              <div className="flex items-center justify-between glass border border-amber-500/30 rounded-xl px-3 py-2">
                <div>
                  <p className="text-xs font-semibold text-amber-400">Running behind schedule</p>
                  <p className="text-[11px] text-gray-500">GPT-4o can reorganise your remaining day</p>
                </div>
                <button
                  onClick={replan}
                  disabled={isRescheduling}
                  className="text-xs font-semibold text-amber-400 hover:text-amber-300 border border-amber-500/30 rounded-lg px-2.5 py-1.5 transition-colors disabled:opacity-50"
                >
                  {isRescheduling ? '…' : 'Reschedule'}
                </button>
              </div>
            )}

            {isRescheduling && !isBehindSchedule && (
              <div className="flex items-center gap-2 text-xs text-ocean-400">
                <span className="animate-spin">⏳</span>
                Rescheduling with AI…
              </div>
            )}
          </div>

          {/* Day accordion */}
          <div className="flex-1 overflow-y-auto">
            {plan.days.map((day) => {
              const dayDone = day.slots.filter((s) => s.done).length;
              const dayTotal = day.slots.length;
              const isExpanded = expandedDay === day.date;

              return (
                <div key={day.date} className="border-b border-white/5">
                  {/* Day header */}
                  <button
                    onClick={() => setExpandedDay(isExpanded ? null : day.date)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
                        dayDone === dayTotal && dayTotal > 0
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-ocean-500/20 text-ocean-400'
                      }`}
                    >
                      {dayDone === dayTotal && dayTotal > 0 ? '✓' : dayTotal > 0 ? dayDone : '—'}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{day.label}</p>
                      <p className="text-[11px] text-gray-500">
                        {dayDone}/{dayTotal} done
                      </p>
                    </div>
                    <span
                      className={`text-gray-500 text-xs transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    >
                      ▾
                    </span>
                  </button>

                  {/* Slots */}
                  {isExpanded && (
                    <div className="pb-2 space-y-0.5 px-3">
                      {day.slots.map((slot, idx) => (
                        <SlotRow
                          key={`${slot.poiId}-${idx}`}
                          slot={slot}
                          date={day.date}
                          onToggle={(done) => markDone(day.date, slot.poiId, done)}
                          onViewMap={() => handleViewOnMap(slot.poiId)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SlotRow sub-component ────────────────────────────────────────────────────

interface SlotRowProps {
  slot: { poiId: string; poiName: string; startTime: string; endTime: string; notes?: string; done: boolean };
  date: string;
  onToggle: (done: boolean) => void;
  onViewMap: () => void;
}

function SlotRow({ slot, onToggle, onViewMap }: SlotRowProps) {
  // Guess category emoji from name keywords
  const emoji = guessEmoji(slot.poiName);
  // Night badge: slots starting at 20:00 or later
  const isNight = slot.startTime >= '20:00';

  return (
    <div
      className={`flex items-start gap-3 rounded-xl p-2.5 transition-all ${
        slot.done ? 'opacity-50' : 'hover:bg-white/5'
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(!slot.done)}
        className={`mt-0.5 w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all ${
          slot.done
            ? 'bg-green-500 border-green-500 text-white'
            : 'border-white/20 hover:border-ocean-400'
        }`}
      >
        {slot.done && <span className="text-[10px] font-bold">✓</span>}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm">{emoji}</span>
          <span
            className={`text-xs font-semibold leading-tight ${
              slot.done ? 'line-through text-gray-500' : 'text-white'
            }`}
          >
            {slot.poiName}
          </span>
          {isNight && !slot.done && (
            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 rounded-full px-1.5 py-0.5 font-medium">
              🌙 night
            </span>
          )}
        </div>
        <p className="text-[11px] text-gray-500 mt-0.5">
          {slot.startTime} – {slot.endTime}
        </p>
        {slot.notes && !slot.done && (
          <p className="text-[11px] text-gray-400 mt-0.5 italic leading-tight">{slot.notes}</p>
        )}
      </div>

      {/* View on map */}
      <button
        onClick={onViewMap}
        title="View on map"
        className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-ocean-400 hover:bg-white/10 transition-all text-xs"
      >
        📍
      </button>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function guessEmoji(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('restaurant') || n.includes('café') || n.includes('bistro') || n.includes('kitchen') || n.includes('grill') || n.includes('sushi') || n.includes('pizza') || n.includes('taco') || n.includes('food')) return '🍽️';
  if (n.includes('rooftop') || n.includes('penthouse') || n.includes('skybar') || n.includes('high rooftop')) return '🏙️';
  if (n.includes('speakeasy') || n.includes('tavern') || n.includes('townhouse')) return '🕯️';
  if (n.includes('bar') || n.includes('cocktail') || n.includes('wine') || n.includes('brewery') || n.includes('pub') || n.includes('lounge') || n.includes('tower bar')) return '🍸';
  if (n.includes('beach') || n.includes('pier') || n.includes('ocean') || n.includes('surf')) return '🏖️';
  if (n.includes('museum') || n.includes('gallery') || n.includes('art') || n.includes('moca') || n.includes('broad') || n.includes('lacma')) return '🎨';
  if (n.includes('park') || n.includes('trail') || n.includes('nature') || n.includes('garden') || n.includes('canyon') || n.includes('lake') || n.includes('reservoir')) return '🌿';
  if (n.includes('view') || n.includes('observatory') || n.includes('overlook') || n.includes('hilltop')) return '🔭';
  if (n.includes('theatre') || n.includes('theater') || n.includes('bowl') || n.includes('concert') || n.includes('cinema')) return '🎭';
  if (n.includes('shop') || n.includes('rodeo') || n.includes('promenade') || n.includes('market')) return '🛍️';
  if (n.includes('hotel') || n.includes('inn') || n.includes('hostel')) return '🛏️';
  if (n.includes('zoo') || n.includes('aquarium')) return '🦁';
  if (n.includes('tour') || n.includes('studio') || n.includes('warner') || n.includes('universal')) return '🎬';
  if (n.includes('church') || n.includes('temple') || n.includes('cathedral')) return '⛪';
  if (n.includes('space') || n.includes('science') || n.includes('endeavour') || n.includes('nasa')) return '🚀';
  if (n.includes('walk of fame') || n.includes('hollywood') || n.includes('star')) return '⭐';
  return '📍';
}
