import React, { useState, useCallback } from 'react';
import { POI } from './types';
import { useGPS } from './hooks/useGPS';
import { usePOIs } from './hooks/usePOIs';
import MapView from './components/MapView';
import Sidebar from './components/Sidebar';
import POIDetail from './components/POIDetail';
import GPSButton from './components/GPSButton';

export default function App() {
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { gps, startTracking, stopTracking, setFollowing } = useGPS();
  const {
    pois, filtered, filters, loading, error,
    toggleCategory, toggleTier, toggleRegion, setSearch, clearFilters,
  } = usePOIs();

  const handleSelectPOI = useCallback((poi: POI | null) => {
    setSelectedPOI(poi);
    // Stop auto-following when user selects a POI
    if (poi) setFollowing(false);
  }, [setFollowing]);

  const handleToggleFollow = useCallback(() => {
    setFollowing(!gps.following);
    if (!gps.tracking) startTracking();
  }, [gps.following, gps.tracking, setFollowing, startTracking]);

  const activeFilterCount =
    filters.categories.size + filters.tiers.size + filters.regions.size +
    (filters.search.trim() ? 1 : 0);

  return (
    <div className="flex h-full w-full relative overflow-hidden bg-dark-500">

      {/* ── Sidebar (desktop left, mobile bottom sheet) ─────────────── */}
      <Sidebar
        pois={pois}
        filtered={filtered}
        selectedPOI={selectedPOI}
        onSelectPOI={handleSelectPOI}
        filters={filters}
        onToggleCategory={toggleCategory}
        onToggleTier={toggleTier}
        onToggleRegion={toggleRegion}
        onSearch={setSearch}
        onClear={clearFilters}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* ── Map area ────────────────────────────────────────────────── */}
      <div className="flex-1 relative">
        {/* API loading / error overlay */}
        {(loading || error) && (
          <div className="absolute inset-x-0 top-16 z-[1100] flex justify-center pointer-events-none px-4">
            {loading && (
              <div className="glass border border-white/10 rounded-xl px-4 py-2 flex items-center gap-2">
                <span className="animate-spin text-base">⏳</span>
                <span className="text-sm text-gray-300">Loading points of interest…</span>
              </div>
            )}
            {error && (
              <div className="glass border border-red-500/40 rounded-xl px-4 py-2 flex items-center gap-2 pointer-events-auto">
                <span className="text-base">⚠️</span>
                <span className="text-sm text-red-400">{error}</span>
              </div>
            )}
          </div>
        )}
        <MapView
          pois={filtered}
          selectedPOI={selectedPOI}
          onSelectPOI={handleSelectPOI}
          gps={gps}
        />

        {/* ── Floating header ──────────────────────────────────────── */}
        <div className="absolute top-0 left-0 right-0 z-[1000] pointer-events-none">
          <div className="flex items-center gap-2 px-3 py-2 safe-top pointer-events-auto">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(v => !v)}
              className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl glass border border-white/10 text-white hover:border-ocean-400 transition-all"
            >
              <span className="text-base">{sidebarOpen ? '✕' : '☰'}</span>
            </button>

            {/* Route progress pill */}
            <div className="glass border border-white/10 rounded-xl px-3 py-2 flex items-center gap-2 flex-1 min-w-0">
              <span className="text-sm">🛣️</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-white truncate">San Francisco → Los Angeles</div>
                <div className="text-[11px] text-gray-500">
                  {filtered.length} stops visible
                  {activeFilterCount > 0 && ` · ${activeFilterCount} filter${activeFilterCount !== 1 ? 's' : ''} active`}
                </div>
              </div>
            </div>

            {/* GPS controls */}
            <GPSButton
              gps={gps}
              onStart={startTracking}
              onStop={stopTracking}
              onToggleFollow={handleToggleFollow}
            />
          </div>
        </div>

        {/* ── Tier legend ──────────────────────────────────────────── */}
        <div className="absolute bottom-6 left-3 z-[999] pointer-events-none">
          <div className="glass border border-white/8 rounded-xl px-3 py-2 space-y-1.5">
            {[
              { color: '#ef4444', label: 'Must-See', dot: true },
              { color: '#f97316', label: 'Recommended', dot: true },
              { color: '#0ea5e9', label: 'Worth a visit', dot: true },
              { color: '#6b7280', label: 'If passing by', dot: true },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color }} />
                <span className="text-[11px] text-gray-400">{label}</span>
              </div>
            ))}
            <div className="border-t border-white/5 pt-1.5 mt-0.5">
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-blue-400 rounded opacity-70" style={{ borderTop: '1px dashed #60a5fa' }} />
                <span className="text-[11px] text-gray-500">Highway 1</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── POI detail panel (desktop right side, mobile bottom sheet) ── */}
        {selectedPOI && (
          <>
            {/* Desktop: fixed right panel */}
            <div className="hidden md:block absolute top-0 right-0 bottom-0 w-80 lg:w-96 z-[1001] overflow-y-auto">
              <POIDetail poi={selectedPOI} onClose={() => setSelectedPOI(null)} />
            </div>

            {/* Mobile: bottom sheet overlay */}
            <div className="md:hidden fixed inset-x-0 bottom-0 z-[3000] safe-bottom">
              <POIDetail poi={selectedPOI} onClose={() => setSelectedPOI(null)} />
            </div>
          </>
        )}

        {/* ── Mobile: tap map to close POI detail ── */}
        {selectedPOI && (
          <div
            className="md:hidden fixed inset-0 z-[2999]"
            onClick={() => setSelectedPOI(null)}
          />
        )}
      </div>
    </div>
  );
}
