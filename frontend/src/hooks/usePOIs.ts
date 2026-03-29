import { useState, useEffect, useMemo } from 'react';
import { POI, Category, Tier, Region } from '../types';

export interface Filters {
  categories: Set<Category>;
  tiers: Set<Tier>;
  regions: Set<Region>;
  search: string;
}

const STORAGE_KEY = 'tg_filters_v1';

function serializeFilters(f: Filters): string {
  return JSON.stringify({
    categories: [...f.categories],
    tiers: [...f.tiers],
    regions: [...f.regions],
    search: f.search,
  });
}

function loadFilters(): Filters {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_FILTERS;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      categories: new Set<Category>((parsed.categories as Category[]) ?? []),
      tiers: new Set<Tier>((parsed.tiers as Tier[]) ?? []),
      regions: new Set<Region>((parsed.regions as Region[]) ?? []),
      search: typeof parsed.search === 'string' ? parsed.search : '',
    };
  } catch {
    return DEFAULT_FILTERS;
  }
}

const DEFAULT_FILTERS: Filters = {
  categories: new Set(),
  tiers: new Set(),
  regions: new Set(),
  search: '',
};

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

export function usePOIs() {
  const [pois, setPois] = useState<POI[]>([]);
  const [filters, setFilters] = useState<Filters>(loadFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/api/pois`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<POI[]>;
      })
      .then(data => {
        setPois(data);
        setError(null);
      })
      .catch(err => {
        console.error('Failed to load POIs:', err);
        setError('Failed to load points of interest. Please try again later.');
      })
      .finally(() => setLoading(false));
  }, []);

  // Persist filters to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, serializeFilters(filters));
    } catch { /* storage unavailable */ }
  }, [filters]);

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
    error,
    toggleCategory,
    toggleTier,
    toggleRegion,
    setSearch,
    clearFilters,
  };
}
