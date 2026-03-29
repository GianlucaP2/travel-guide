import React, { useState, useCallback } from 'react';
import { POI } from '../types';
import { Filters } from '../hooks/usePOIs';
import { CATEGORY_EMOJI, CATEGORY_LABEL, tierColor, tierBadge } from '../utils/markers';
import FilterPanel from './FilterPanel';

// ── Itinerary URL builder ─────────────────────────────────────────────────────
// Sorts stops north-to-south (by distanceFromSF) so Maps gets the optimal order.
// Uses named addresses — never raw coordinates — so Google Maps resolves them correctly.
function buildItineraryUrl(pois: POI[]): string {
  const sorted = [...pois].sort((a, b) => (a.distanceFromSF ?? 0) - (b.distanceFromSF ?? 0));
  const stops = sorted.map(p => {
    // Prefer the stored address; fall back to "Name, Region, CA" for named search
    const label = p.address ?? `${p.name}, ${p.region}, CA`;
    return encodeURIComponent(label);
  });
  return `https://www.google.com/maps/dir/${stops.join('/')}`;
}

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

  // ── Itinerary planning state ────────────────────────────────────────────────
  const [planMode, setPlanMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const cancelPlan = useCallback(() => {
    setPlanMode(false);
    setSelectedIds(new Set());
  }, []);

  const openItinerary = useCallback(() => {
    const chosen = filtered.filter(p => selectedIds.has(p.id));
    window.open(buildItineraryUrl(chosen), '_blank', 'noopener');
  }, [filtered, selectedIds]);

  // ───────────────────────────────────────────────────────────────────────────

  const activeFilterCount =
    filters.categories.size + filters.tiers.size + filters.regions.size +
    (filters.search.trim() ? 1 : 0);

  const sharedPlanProps = { planMode, selectedIds, toggleSelect };

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
          planMode={planMode}
          selectedIds={selectedIds}
          toggleSelect={toggleSelect}
          onStartPlan={() => setPlanMode(true)}
          onCancelPlan={cancelPlan}
          onOpenItinerary={openItinerary}
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
            planMode={planMode}
            selectedIds={selectedIds}
            toggleSelect={toggleSelect}
            onStartPlan={() => setPlanMode(true)}
            onCancelPlan={cancelPlan}
            onOpenItinerary={openItinerary}
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
  planMode, selectedIds, toggleSelect, onStartPlan, onCancelPlan, onOpenItinerary,
}: any) {
  const selectedCount = selectedIds.size;

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

        {/* Tabs + Plan toggle */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl overflow-hidden bg-dark-400 border border-white/5 flex-1">
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
          {/* Plan mode toggle */}
          {!planMode ? (
            <button
              onClick={onStartPlan}
              title="Select stops to build a route"
              className="flex-shrink-0 flex items-center gap-1 px-2.5 py-2 rounded-xl bg-dark-400 border border-white/10 text-gray-400 hover:text-white hover:border-ocean-500 transition-all text-xs font-medium"
            >
              <span>🗺️</span>
              <span className="hidden sm:inline">Plan</span>
            </button>
          ) : (
            <button
              onClick={onCancelPlan}
              title="Cancel planning"
              className="flex-shrink-0 flex items-center gap-1 px-2.5 py-2 rounded-xl bg-dark-400 border border-red-500/40 text-red-400 hover:border-red-400 transition-all text-xs font-medium"
            >
              <span>✕</span>
              <span className="hidden sm:inline">Cancel</span>
            </button>
          )}
        </div>

        {/* Plan mode info bar */}
        {planMode && (
          <div className="mt-2 px-3 py-2 rounded-xl bg-ocean-500/10 border border-ocean-500/25 text-xs text-ocean-300">
            {selectedCount === 0
              ? 'Tap stops below to add them to your route'
              : selectedCount === 1
              ? '1 stop selected — add at least one more'
              : `${selectedCount} stops selected · sorted SF → LA`}
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'list' ? (
          <POIList
            filtered={filtered}
            selectedPOI={selectedPOI}
            onSelectPOI={onSelectPOI}
            planMode={planMode}
            selectedIds={selectedIds}
            onToggle={toggleSelect}
          />
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

      {/* ── Create Itinerary sticky footer (plan mode, ≥2 selected) ── */}
      {planMode && selectedCount >= 2 && (
        <div className="flex-shrink-0 p-3 border-t border-white/10 bg-dark-500/80 backdrop-blur-sm">
          <button
            onClick={onOpenItinerary}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-ocean-600 to-ocean-500 hover:from-ocean-500 hover:to-ocean-400 active:scale-[0.98] transition-all shadow-lg shadow-ocean-900/40"
          >
            <span>🗺️</span>
            <span>Open Itinerary in Google Maps</span>
            <span className="ml-1 bg-white/20 rounded-full px-2 py-0.5 text-xs">{selectedCount}</span>
          </button>
          <p className="text-center text-[11px] text-gray-600 mt-1.5">Opens Google Maps · route not started automatically</p>
        </div>
      )}
    </div>
  );
}

// ── POI list ──────────────────────────────────────────────────────────────────
function POIList({
  filtered, selectedPOI, onSelectPOI,
  planMode, selectedIds, onToggle,
}: {
  filtered: POI[];
  selectedPOI: POI | null;
  onSelectPOI: (p: POI) => void;
  planMode: boolean;
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
}) {
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
              planMode={planMode}
              inItinerary={selectedIds.has(poi.id)}
              onToggle={() => onToggle(poi.id)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Single POI card in the list ───────────────────────────────────────────────
function POICard({
  poi, selected, onClick,
  planMode, inItinerary, onToggle,
}: {
  poi: POI;
  selected: boolean;
  onClick: () => void;
  planMode: boolean;
  inItinerary: boolean;
  onToggle: () => void;
}) {
  const color = tierColor(poi.tier);
  const handleClick = planMode ? onToggle : onClick;

  return (
    <button
      onClick={handleClick}
      className={`w-full text-left px-4 py-3 border-b border-white/5 transition-all hover:bg-white/5 active:bg-white/10 ${
        planMode
          ? inItinerary
            ? 'bg-ocean-500/15 border-l-2 border-l-ocean-400'
            : 'border-l-2 border-l-transparent'
          : selected
          ? 'bg-white/10 border-l-2'
          : 'border-l-2 border-l-transparent'
      }`}
      style={!planMode && selected ? { borderLeftColor: color } : {}}
    >
      <div className="flex items-center gap-2">
        {/* Plan mode checkbox */}
        {planMode && (
          <div className={`flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
            inItinerary
              ? 'bg-ocean-500 border-ocean-400'
              : 'border-white/25 bg-dark-400'
          }`}>
            {inItinerary && <span className="text-white text-[10px] font-bold">✓</span>}
          </div>
        )}
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
        {!planMode && <span className="text-gray-600 text-xs flex-shrink-0">›</span>}
      </div>
    </button>
  );
}
