import { useState, useEffect } from 'react';

export interface WikiData {
  imageUrl: string | null;
  extract: string | null;
  wikiUrl: string | null;
  loading: boolean;
}

const cache = new Map<string, WikiData>();
const EMPTY: WikiData = { imageUrl: null, extract: null, wikiUrl: null, loading: false };

function upgradeThumbnail(url: string): string {
  return url.replace(/\/\d+px-([^/]+)$/, '/800px-$1');
}

export function useWikipediaData(
  poiName: string,
  region: string,
  lat?: number,
  lng?: number,
): WikiData {
  const key = poiName + '||' + region;

  const [data, setData] = useState<WikiData>(() =>
    cache.has(key) ? cache.get(key)! : { ...EMPTY, loading: true },
  );

  useEffect(() => {
    if (cache.has(key)) { setData(cache.get(key)!); return; }
    let cancelled = false;
    setData({ imageUrl: null, extract: null, wikiUrl: null, loading: true });

    async function fetchData() {
      let page: Record<string, unknown> | null = null;
      try {
        const r = await fetch(
          'https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(poiName.replace(/ /g, '_')),
          { headers: { Accept: 'application/json' } },
        );
        if (r.ok) page = await r.json() as Record<string, unknown>;
      } catch { /* ignore */ }

      if (!page) {
        try {
          const sr = await fetch(
            'https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=' +
            encodeURIComponent(poiName + ' ' + region) + '&srlimit=1&format=json&origin=*',
          );
          const sd = await sr.json() as { query?: { search?: { title?: string }[] } };
          const title = sd?.query?.search?.[0]?.title;
          if (title) {
            const pr = await fetch(
              'https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(title),
              { headers: { Accept: 'application/json' } },
            );
            if (pr.ok) page = await pr.json() as Record<string, unknown>;
          }
        } catch { /* ignore */ }
      }

      let imageUrl: string | null = null;
      let extract: string | null = null;
      let wikiUrl: string | null = null;

      if (page) {
        const thumb = (page as { thumbnail?: { source?: string } }).thumbnail?.source;
        if (thumb) imageUrl = upgradeThumbnail(thumb);
        extract = (page as { extract?: string }).extract ?? null;
        wikiUrl = ((page as { content_urls?: { desktop?: { page?: string } } }).content_urls?.desktop?.page) ?? null;
      }

      if (!imageUrl && lat !== undefined && lng !== undefined) {
        try {
          const gr = await fetch(
            'https://commons.wikimedia.org/w/api.php?action=query&list=geosearch&gscoord=' +
            lat + '|' + lng + '&gsradius=500&gslimit=5&format=json&origin=*',
          );
          const gd = await gr.json() as { query?: { geosearch?: { pageid?: number }[] } };
          const geopages = gd?.query?.geosearch ?? [];
          for (const gpage of geopages) {
            if (!gpage.pageid) continue;
            const ir = await fetch(
              'https://commons.wikimedia.org/w/api.php?action=query&pageids=' + gpage.pageid +
              '&prop=imageinfo&iiprop=url&iiurlwidth=800&format=json&origin=*',
            );
            const id = await ir.json() as { query?: { pages?: Record<string, { imageinfo?: { url?: string }[] }> } };
            const pdata = id?.query?.pages?.[String(gpage.pageid)];
            const imgUrl = pdata?.imageinfo?.[0]?.url;
            if (imgUrl && /\.(jpg|jpeg|png|webp)/i.test(imgUrl)) {
              imageUrl = imgUrl;
              break;
            }
          }
        } catch { /* ignore */ }
      }

      if (cancelled) return;
      const result: WikiData = { imageUrl, extract, wikiUrl, loading: false };
      cache.set(key, result);
      setData(result);
    }

    fetchData().catch(() => {
      if (cancelled) return;
      cache.set(key, EMPTY);
      setData(EMPTY);
    });

    return () => { cancelled = true; };
  }, [key, lat, lng]); // eslint-disable-line react-hooks/exhaustive-deps

  return data;
}
