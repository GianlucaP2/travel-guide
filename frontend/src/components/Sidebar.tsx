import React, { useState } from 'react';
import { POI } from '../types';
import { Filters } from '../hooks/usePOIs';
import { CATEGORY_EMOJI, CATEGORY_LABEL, tierColor, tierBadge } from '../utils/markers';
import FilterPanel from './FilterPanel';

interface SidebarProps {
  pois: POI[];
  filtered: POI[];
  selectedPOI: POI | null;
  onSelectPOI: (poi: POI | null) => void;
  filters: Filters;
  onToggleCategory: (cat: any) => void;
  onToggleTier: (t: any) => void;
  onToggleRegion: (r: any) => void;
  onSearch: (s: string) => void;
  onClear: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({
  pois, filtered, selectedPOI, onSelectPOI,
  filters, onToggleCategory, onToggleTier, onToggleRegion, onSearch, onClear,
  isOpen, onClose,
}: SidebarProps) {
  const [tab, setTab] = useState<'list' | 'filters'>('list');

  const activeFilterCount =
    filters.categories.size + filters.tiers.size + filters.regions.size +
    (filters.search.trim() ? 1 : 0);

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────────────── */}
      <div className="hidden md:flex flex-col glass w-80 lg:w-96 h-full z-[1000] border-r border-white/5 flex-shrink-0">
        <SidebarContent
          pois={pois}
          filtered={filtered}
          selectedPOI={selectedPOI}
          onSelectPOI={onSelectPOI}
          filters={filters}
          onToggleCategory={onToggleCategory}
          onToggleTier={onToggleTier}
          onToggleRegion={onToggleRegion}
          onSearch={onSearch}
          onClear={onClear}
          tab={tab}
          setTab={setTab}
          activeFilterCount={activeFilterCount}
        />
      </div>

      {/* ── Mobile bottom sheet ─────────────────────────────────────── */}
      <div
        className={`md:hidden fixed inset-x-0 bottom-0 z-[2000] transition-transform duration-300 ${
          isOpen ? 'translate-y-0' : 'translate-y-[calc(100%-4.5rem)]'
        }`}
      >
        {/* Drag handle */}
        <div
          className="glass rounded-t-2xl border-t border-white/10 cursor-pointer"
          onClick={isOpen ? onClose : undefined}
        >
          <div className="flex items-center justify-between px-4 py-3" onClick={onClose}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-1 bg-white/20 rounded-full mx-auto" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">{filtered.length} stops</span>
              {activeFilterCount > 0 && (
                <span className="text-xs bg-ocean-500 text-white rounded-full px-1.5 py-0.5">{activeFilterCount}</span>
              )}
              <span className="text-white/60 text-sm">{isOpen ? '▼' : '▲'}</span>
            </div>
          </div>
        </div>
        <div className="glass border-t border-white/5 h-[65vh] overflow-hidden">
          <SidebarContent
            pois={pois}
            filtered={filtered}
            selectedPOI={selectedPOI}
            onSelectPOI={(poi: POI | null) => { onSelectPOI(poi); onClose(); }}
            filters={filters}
            onToggleCategory={onToggleCategory}
            onToggleTier={onToggleTier}
            onToggleRegion={onToggleRegion}
            onSearch={onSearch}
            onClear={onClear}
            tab={tab}
            setTab={setTab}
            activeFilterCount={activeFilterCount}
          />
        </div>
      </div>
    </>
  );
}

// ── Shared sidebar content ────────────────────────────────────────────────────
function SidebarContent({
  pois, filtered, selectedPOI, onSelectPOI,
  filters, onToggleCategory, onToggleTier, onToggleRegion, onSearch, onClear,
  tab, setTab, activeFilterCount,
}: any) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-4 pb-2">
        <div className="flex items-center gap-1 mb-3">
          <span className="text-lg">🛣️</span>
          <span className="font-bold text-white">Highway 1 Guide</span>
          <span className="ml-auto text-xs text-gray-500">{filtered.length}/{pois.length}</span>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search stops…"
            value={filters.search}
            onChange={e => onSearch(e.target.value)}
            className="w-full bg-dark-400 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-ocean-500 transition-colors"
          />
          {filters.search && (
            <button onClick={() => onSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">✕</button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl overflow-hidden bg-dark-400 border border-white/5">
          {(['list', 'filters'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-xs font-medium capitalize transition-colors ${
                tab === t ? 'bg-ocean-600 text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {t === 'filters' && activeFilterCount > 0 ? `Filters (${activeFilterCount})` : t === 'list' ? 'Stops' : 'Filters'}
            </button>
          ))}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'list' ? (
          <POIList filtered={filtered} selectedPOI={selectedPOI} onSelectPOI={onSelectPOI} />
        ) : (
          <FilterPanel
            filters={filters}
            onToggleCategory={onToggleCategory}
            onToggleTier={onToggleTier}
            onToggleRegion={onToggleRegion}
            onClear={onClear}
          />
        )}
      </div>
    </div>
  );
}

// ── POI list ──────────────────────────────────────────────────────────────────
function POIList({ filtered, selectedPOI, onSelectPOI }: { filtered: POI[]; selectedPOI: POI | null; onSelectPOI: (p: POI) => void }) {
  // Group by region
  const byRegion: Record<string, POI[]> = {};
  for (const p of filtered) {
    if (!byRegion[p.region]) byRegion[p.region] = [];
    byRegion[p.region].push(p);
  }

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-6">
        <span className="text-4xl mb-3">🗺️</span>
        <p className="text-gray-500 text-sm">No stops match your filters.</p>
        <p className="text-gray-600 text-xs mt-1">Try adjusting the search or filters.</p>
      </div>
    );
  }

  return (
    <div className="pb-6">
      {Object.entries(byRegion).map(([region, regionPois]) => (
        <div key={region}>
          <div className="sticky top-0 z-10 px-4 py-1.5 bg-dark-400/90 backdrop-blur-sm border-y border-white/5">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{region}</span>
            <span className="ml-1.5 text-[11px] text-gray-600">({regionPois.length})</span>
          </div>
          {regionPois.map(poi => (
            <POICard
              key={poi.id}
              poi={poi}
              selected={selectedPOI?.id === poi.id}
              onClick={() => onSelectPOI(poi)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Single POI card in the list ───────────────────────────────────────────────
function POICard({ poi, selected, onClick }: { poi: POI; selected: boolean; onClick: () => void }) {
  const color = tierColor(poi.tier);
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 border-b border-white/5 transition-all hover:bg-white/5 active:bg-white/10 ${
        selected ? 'bg-white/10 border-l-2' : 'border-l-2 border-l-transparent'
      }`}
      style={selected ? { borderLeftColor: color } : {}}
    >
      <div className="flex items-center gap-2">
        <span className="text-base flex-shrink-0">{CATEGORY_EMOJI[poi.category]}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-white truncate">{poi.name}</span>
            {poi.tier === 1 && <span className="flex-shrink-0 text-xs px-1.5 py-0.5 rounded-full font-semibold" style={{ background: color + '22', color }}>🔥</span>}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px]" style={{ color }}>{tierBadge(poi.tier)}</span>
            {poi.price && <span className="text-[11px] text-gray-600">{poi.price}</span>}
          </div>
        </div>
        <span className="text-gray-600 text-xs flex-shrink-0">›</span>
      </div>
    </button>
  );
}
