import React from 'react';
import { Category, Tier, Region } from '../types';
import { Filters } from '../hooks/usePOIs';
import { CATEGORY_EMOJI, CATEGORY_LABEL, tierColor, tierBadge } from '../utils/markers';
import { POIS } from '../data/pois';

const ALL_CATEGORIES: Category[] = [
  'beach', 'viewpoint', 'restaurant', 'bar', 'landmark',
  'nature', 'experience', 'camping', 'shopping', 'accommodation',
];

const ALL_TIERS: Tier[] = [1, 2, 3, 4];

// Ordered list of regions north→south
const ORDERED_REGIONS: Region[] = [
  'San Francisco', 'Pacifica', 'Half Moon Bay', 'Santa Cruz',
  'Monterey', 'Pacific Grove', 'Carmel', 'Big Sur', 'San Simeon',
  'Cambria', 'Cayucos', 'Morro Bay', 'San Luis Obispo', 'Pismo Beach',
  'Gaviota', 'Santa Barbara', 'Ventura', 'Malibu', 'Santa Monica / LA',
];

interface FilterPanelProps {
  filters: Filters;
  onToggleCategory: (cat: Category) => void;
  onToggleTier: (tier: Tier) => void;
  onToggleRegion: (region: Region) => void;
  onClear: () => void;
}

export default function FilterPanel({ filters, onToggleCategory, onToggleTier, onToggleRegion, onClear }: FilterPanelProps) {
  const hasFilters = filters.categories.size > 0 || filters.tiers.size > 0 || filters.regions.size > 0;

  return (
    <div className="p-4 space-y-5 pb-8">
      {/* Tier filter */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Importance</h3>
        </div>
        <div className="space-y-1.5">
          {ALL_TIERS.map(tier => {
            const active = filters.tiers.has(tier);
            const color = tierColor(tier);
            const count = POIS.filter(p => p.tier === tier).length;
            return (
              <button
                key={tier}
                onClick={() => onToggleTier(tier)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left ${
                  active
                    ? 'border-opacity-100 bg-opacity-15'
                    : 'border-white/5 bg-white/3 hover:bg-white/5'
                }`}
                style={active ? {
                  borderColor: color,
                  backgroundColor: color + '22',
                } : {}}
              >
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color }} />
                <span className="text-sm text-white flex-1">{tierBadge(tier)}</span>
                <span className="text-xs text-gray-500">{count}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Category filter */}
      <section>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Category</h3>
        <div className="grid grid-cols-2 gap-1.5">
          {ALL_CATEGORIES.map(cat => {
            const active = filters.categories.has(cat);
            const count = POIS.filter(p => p.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => onToggleCategory(cat)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-all ${
                  active
                    ? 'bg-ocean-500/20 border-ocean-500 text-white'
                    : 'bg-white/3 border-white/5 text-gray-400 hover:bg-white/8 hover:text-gray-300'
                }`}
              >
                <span className="text-base">{CATEGORY_EMOJI[cat]}</span>
                <div className="min-w-0">
                  <div className="text-xs font-medium truncate">{CATEGORY_LABEL[cat]}</div>
                  <div className="text-[10px] text-gray-600">{count} stops</div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Region filter */}
      <section>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Region</h3>
        <div className="space-y-1">
          {ORDERED_REGIONS.map(region => {
            const active = filters.regions.has(region);
            const count = POIS.filter(p => p.region === region).length;
            if (count === 0) return null;
            return (
              <button
                key={region}
                onClick={() => onToggleRegion(region)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-all text-left ${
                  active
                    ? 'bg-ocean-500/20 border-ocean-500 text-white'
                    : 'bg-white/3 border-white/5 text-gray-400 hover:bg-white/8 hover:text-gray-300'
                }`}
              >
                <span className="text-sm">{region}</span>
                <span className="text-xs text-gray-600">{count}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Clear */}
      {hasFilters && (
        <button
          onClick={onClear}
          className="w-full py-2.5 rounded-xl border border-red-500/40 text-red-400 text-sm font-medium hover:bg-red-500/10 transition-colors"
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}
