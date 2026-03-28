import { useState, useEffect } from 'react';

export interface WikiData {
  imageUrl: string | null;
  extract: string | null;
  wikiUrl: string | null;
  loading: boolean;
}

// Module-level cache: survives re-renders and component unmounts
const cache = new Map<string, WikiData>();
const EMPTY: WikiData = { imageUrl: null, extract: null, wikiUrl: null, loading: false };

/**
 * Fetches Wikipedia image + summary extract for a given POI name.
 * Two-step: search → summary REST endpoint.
 * Completely free — no API key required.
 */
export function useWikipediaData(poiName: string, region: string): WikiData {
  const key = `${poiName}||${region}`;

  const [data, setData] = useState<WikiData>(() =>
    cache.has(key) ? cache.get(key)! : { ...EMPTY, loading: true }
  );

  useEffect(() => {
    if (cache.has(key)) {
      setData(cache.get(key)!);
      return;
    }

    let cancelled = false;
    setData({ imageUrl: null, extract: null, wikiUrl: null, loading: true });

    // 1. Try exact title first (fast, single request)
    const exactTitle = poiName.replace(/ /g, '_');

    fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(exactTitle)}`,
      { headers: { Accept: 'application/json' } }
    )
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .catch(() =>
        // 2. Fall back to search if exact title fails
        fetch(
          `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(poiName)}&srlimit=1&format=json&origin=*`
        )
          .then(r => r.json())
          .then(d => {
            const title = d?.query?.search?.[0]?.title as string | undefined;
            if (!title) return null;
            return fetch(
              `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
              { headers: { Accept: 'application/json' } }
            ).then(r => (r.ok ? r.json() : null));
          })
      )
      .then(page => {
        if (cancelled) return;
        if (!page) {
          cache.set(key, EMPTY);
          setData(EMPTY);
          return;
        }
        // Upgrade thumbnail to larger resolution
        const rawThumb = page?.thumbnail?.source as string | undefined;
        const imageUrl = rawThumb
          ? rawThumb.replace(/\/\d+px-([^/]+)$/, '/640px-$1')
          : null;
        const result: WikiData = {
          imageUrl,
          extract: (page?.extract as string | null) ?? null,
          wikiUrl: (page?.content_urls?.desktop?.page as string | null) ?? null,
          loading: false,
        };
        cache.set(key, result);
        setData(result);
      })
      .catch(() => {
        if (cancelled) return;
        cache.set(key, EMPTY);
        setData(EMPTY);
      });

    return () => { cancelled = true; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  return data;
}
