import { useState, useEffect, useMemo } from 'react';
import { POI, Category, Tier, Region } from '../types';
import { POIS } from '../data/pois';

export interface Filters {
  categories: Set<Category>;
  tiers: Set<Tier>;
  regions: Set<Region>;
  search: string;
}

const DEFAULT_FILTERS: Filters = {
  categories: new Set(),
  tiers: new Set(),
  regions: new Set(),
  search: '',
};

export function usePOIs() {
  const [pois] = useState<POI[]>(POIS);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [loading] = useState(false);

  const filtered = useMemo(() => {
    return pois.filter(p => {
      if (filters.categories.size > 0 && !filters.categories.has(p.category)) return false;
      if (filters.tiers.size > 0 && !filters.tiers.has(p.tier)) return false;
      if (filters.regions.size > 0 && !filters.regions.has(p.region)) return false;
      if (filters.search.trim()) {
        const q = filters.search.toLowerCase();
        if (
          !p.name.toLowerCase().includes(q) &&
          !p.description.toLowerCase().includes(q) &&
          !p.region.toLowerCase().includes(q) &&
          !(p.tags?.some(t => t.toLowerCase().includes(q)))
        ) return false;
      }
      return true;
    });
  }, [pois, filters]);

  const toggleCategory = (cat: Category) => {
    setFilters(f => {
      const next = new Set(f.categories);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return { ...f, categories: next };
    });
  };

  const toggleTier = (tier: Tier) => {
    setFilters(f => {
      const next = new Set(f.tiers);
      next.has(tier) ? next.delete(tier) : next.add(tier);
      return { ...f, tiers: next };
    });
  };

  const toggleRegion = (region: Region) => {
    setFilters(f => {
      const next = new Set(f.regions);
      next.has(region) ? next.delete(region) : next.add(region);
      return { ...f, regions: next };
    });
  };

  const setSearch = (s: string) => {
    setFilters(f => ({ ...f, search: s }));
  };

  const clearFilters = () => setFilters(DEFAULT_FILTERS);

  return {
    pois,
    filtered,
    filters,
    loading,
    toggleCategory,
    toggleTier,
    toggleRegion,
    setSearch,
    clearFilters,
  };
}
