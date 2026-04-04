import React, { useState, useMemo } from 'react';
import {
  LA_EVENTS, ALL_EVENT_AREAS, ALL_EVENT_TAGS,
  STATUS_CONFIG, EVENTS_DATE, LA_SUNSET_TIME,
  type LAEvent, type EventTag,
} from '../data/events';

interface Props {
  onClose: () => void;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function timeBlock(hour: number): string {
  if (hour < 16) return 'Afternoon';
  if (hour < 19) return '🌅 Sunset Window';
  if (hour < 21) return '🌆 Evening';
  return '🌙 Late Night';
}

const BLOCK_ORDER = ['Afternoon', '🌅 Sunset Window', '🌆 Evening', '🌙 Late Night'];

// ─── Component ────────────────────────────────────────────────────────────────
export default function EventsPanel({ onClose }: Props) {
  const [areaFilter, setAreaFilter] = useState<string>('All Areas');
  const [tagFilter, setTagFilter] = useState<EventTag | null>(null);
  const [freeOnly, setFreeOnly] = useState(false);
  const [search, setSearch] = useState('');

  // ── filtered + grouped ────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return LA_EVENTS.filter(ev => {
      if (areaFilter !== 'All Areas' && ev.area !== areaFilter) return false;
      if (tagFilter && !ev.tags.includes(tagFilter)) return false;
      if (freeOnly && !ev.isFree) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !ev.name.toLowerCase().includes(q) &&
          !ev.venue.toLowerCase().includes(q) &&
          !ev.area.toLowerCase().includes(q) &&
          !(ev.description ?? '').toLowerCase().includes(q)
        ) return false;
      }
      return true;
    }).sort((a, b) => a.sortHour - b.sortHour);
  }, [areaFilter, tagFilter, freeOnly, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, LAEvent[]>();
    for (const block of BLOCK_ORDER) map.set(block, []);
    for (const ev of filtered) {
      const block = timeBlock(ev.sortHour);
      map.get(block)!.push(ev);
    }
    return map;
  }, [filtered]);

  const freeCount = LA_EVENTS.filter(e => e.isFree).length;

  return (
    <div className="flex flex-col h-full bg-dark-500 text-white">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-white/8 flex-shrink-0">
        <span className="text-xl">🎉</span>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-white leading-tight">Events Today</h2>
          <p className="text-[11px] text-gray-500 truncate">
            {EVENTS_DATE} · Sunset {LA_SUNSET_TIME} · {LA_EVENTS.length} events found
          </p>
        </div>
        <button
          onClick={onClose}
          className="flex items-center justify-center w-8 h-8 rounded-lg glass border border-white/10 text-gray-400 hover:text-white hover:border-white/30 transition-all flex-shrink-0"
        >
          ✕
        </button>
      </div>

      {/* ── Search ──────────────────────────────────────────────────────────── */}
      <div className="px-4 pt-3 pb-2 flex-shrink-0">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search events, venues…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-ocean-400 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-4 space-y-2 pb-3">
        {/* Area chips */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {ALL_EVENT_AREAS.map(area => (
            <button
              key={area}
              onClick={() => setAreaFilter(area)}
              className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                areaFilter === area
                  ? 'bg-ocean-500/20 border-ocean-400 text-ocean-300'
                  : 'glass border-white/10 text-gray-400 hover:border-white/30 hover:text-gray-200'
              }`}
            >
              {area}
            </button>
          ))}
        </div>

        {/* Tag chips */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          <button
            onClick={() => setTagFilter(null)}
            className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
              tagFilter === null
                ? 'bg-ocean-500/20 border-ocean-400 text-ocean-300'
                : 'glass border-white/10 text-gray-400 hover:border-white/30'
            }`}
          >
            All
          </button>
          {ALL_EVENT_TAGS.map(({ tag, label, emoji }) => (
            <button
              key={tag}
              onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
              className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                tagFilter === tag
                  ? 'bg-ocean-500/20 border-ocean-400 text-ocean-300'
                  : 'glass border-white/10 text-gray-400 hover:border-white/30'
              }`}
            >
              {emoji} {label}
            </button>
          ))}
        </div>

        {/* Free toggle + count */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setFreeOnly(v => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
              freeOnly
                ? 'bg-green-500/20 border-green-400 text-green-300'
                : 'glass border-white/10 text-gray-400 hover:border-white/30'
            }`}
          >
            🆓 Free only
          </button>
          <span className="text-[11px] text-gray-500">
            {filtered.length} of {LA_EVENTS.length} shown · {freeCount} free tonight
          </span>
        </div>
      </div>

      {/* ── Event list ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-5">
        {filtered.length === 0 ? (
          <div className="text-center text-gray-500 text-sm pt-10">
            No events match your filters.
          </div>
        ) : (
          BLOCK_ORDER.map(block => {
            const events = grouped.get(block)!;
            if (events.length === 0) return null;
            return (
              <div key={block}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {block}
                  </span>
                  {block === '🌅 Sunset Window' && (
                    <span className="text-[10px] text-amber-400/80 border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                      Sunset {LA_SUNSET_TIME}
                    </span>
                  )}
                  <div className="flex-1 h-px bg-white/5" />
                </div>
                <div className="space-y-2">
                  {events.map(ev => (
                    <EventCard key={ev.id} event={ev} />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Event Card ───────────────────────────────────────────────────────────────
function EventCard({ event: ev }: { event: LAEvent }) {
  const statusCfg = STATUS_CONFIG[ev.status];

  return (
    <a
      href={ev.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block glass border border-white/8 rounded-xl p-3 hover:border-ocean-400/50 transition-all group"
    >
      {/* top row: time + status + price */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-ocean-300 tabular-nums">{ev.time}</span>
          <span
            className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${statusCfg.color}`}
          >
            {statusCfg.label}
          </span>
        </div>
        <span className={`text-xs font-semibold flex-shrink-0 ${ev.isFree ? 'text-green-400' : 'text-gray-300'}`}>
          {ev.isFree ? '🆓 Free' : ev.price}
        </span>
      </div>

      {/* name */}
      <div className="text-sm font-semibold text-white leading-snug mb-1 group-hover:text-ocean-200 transition-colors">
        {ev.name}
      </div>

      {/* venue + area */}
      <div className="flex items-center gap-1 text-[11px] text-gray-500 mb-2">
        <span>📍</span>
        <span className="truncate">{ev.venue}</span>
        <span>·</span>
        <span className="text-gray-600">{ev.area}</span>
      </div>

      {/* description */}
      {ev.description && (
        <p className="text-[11px] text-gray-500 leading-relaxed mb-2 line-clamp-2">
          {ev.description}
        </p>
      )}

      {/* tags */}
      <div className="flex flex-wrap gap-1">
        {ev.tags.slice(0, 5).map(tag => {
          const cfg = ALL_EVENT_TAGS.find(t => t.tag === tag);
          return (
            <span
              key={tag}
              className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 border border-white/8 text-gray-500"
            >
              {cfg?.emoji} {cfg?.label ?? tag}
            </span>
          );
        })}
      </div>

      {/* CTA */}
      <div className="mt-2 text-[10px] text-ocean-400/60 group-hover:text-ocean-400 transition-colors text-right">
        Get tickets →
      </div>
    </a>
  );
}
