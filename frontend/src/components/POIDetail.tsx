import React, { useState } from 'react';
import { POI } from '../types';
import { CATEGORY_EMOJI, CATEGORY_LABEL, tierColor, tierBadge } from '../utils/markers';
import { useWikipediaData } from '../hooks/useWikipediaData';

interface POIDetailProps {
  poi: POI;
  onClose: () => void;
}

export default function POIDetail({ poi, onClose }: POIDetailProps) {
  const color = tierColor(poi.tier);
  const wiki = useWikipediaData(poi.name, poi.region);
  const [wikiExpanded, setWikiExpanded] = useState(false);

  const mapsDirectionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${poi.lat},${poi.lng}`;
  const mapsPlaceUrl = `https://www.google.com/maps/search/${encodeURIComponent(poi.name + ' ' + poi.region + ' California')}/@${poi.lat},${poi.lng},15z`;

  return (
    <div className="glass flex flex-col max-h-[85vh] md:max-h-full overflow-hidden rounded-t-2xl md:rounded-none">
      {/* Color accent bar */}
      <div
        className="flex-shrink-0 h-1"
        style={{ background: `linear-gradient(to right, ${color}, ${color}88)` }}
      />

      {/* Hero image from Wikipedia */}
      <div className="flex-shrink-0 w-full h-44 bg-white/5 overflow-hidden relative">
        {wiki.loading && (
          <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-white/5 via-white/10 to-white/5" />
        )}
        {wiki.imageUrl && (
          <img src={wiki.imageUrl} alt={poi.name} className="w-full h-full object-cover" loading="lazy" />
        )}
        {!wiki.loading && !wiki.imageUrl && (
          <div className="absolute inset-0 flex items-center justify-center opacity-15">
            <span className="text-6xl">{CATEGORY_EMOJI[poi.category]}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
        <button
          onClick={onClose}
          className="absolute top-2.5 right-2.5 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white/80 hover:text-white transition-colors text-sm z-10"
        >
          ✕
        </button>
        <div className="absolute bottom-2.5 left-3 pointer-events-none">
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold backdrop-blur-sm" style={{ background: color + 'cc', color: 'white' }}>
            {tierBadge(poi.tier)}
          </span>
        </div>
      </div>

      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-3 pb-3 border-b border-white/5">
        <div className="flex items-start gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ background: color + '22', border: `1px solid ${color}44` }}
          >
            {CATEGORY_EMOJI[poi.category]}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-white text-base leading-snug">{poi.name}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs text-gray-500">{CATEGORY_LABEL[poi.category]}</span>
              {poi.price && <span className="text-xs text-gray-500">{poi.price}</span>}
              <span className="text-xs text-gray-600">{poi.region}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Description */}
        <p className="text-gray-300 text-sm leading-relaxed">{poi.description}</p>

        {/* Wikipedia section */}
        {(wiki.extract || wiki.loading) && (
          <div className="rounded-xl border border-white/8 overflow-hidden">
            <button
              onClick={() => setWikiExpanded(v => !v)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/5 transition-colors text-left"
            >
              <span className="text-sm flex-shrink-0">📖</span>
              <span className="text-xs font-semibold text-gray-300 flex-1">Wikipedia</span>
              {wiki.loading
                ? <span className="text-xs text-gray-600 animate-pulse">loading…</span>
                : <span className="text-gray-500 text-xs">{wikiExpanded ? '▲' : '▼'}</span>
              }
            </button>
            {wikiExpanded && wiki.extract && (
              <div className="px-3 pb-3 border-t border-white/5">
                <p className="text-sm text-gray-400 leading-relaxed pt-2 line-clamp-8">{wiki.extract}</p>
                {wiki.wikiUrl && (
                  <a href={wiki.wikiUrl} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:text-blue-300 mt-2 inline-flex items-center gap-1 transition-colors">
                    Read full article on Wikipedia →
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {/* Pro Tips */}
        {poi.tips && (
          <div className="rounded-xl p-3 border" style={{ background: '#fbbf2408', borderColor: '#fbbf2422' }}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-sm">💡</span>
              <span className="text-xs font-semibold text-yellow-400">Pro Tips</span>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed">{poi.tips}</p>
          </div>
        )}

        {/* Meta grid */}
        <div className="grid grid-cols-1 gap-2">
          {poi.address && (
            <MetaRow icon="📍" label="Address" value={poi.address} />
          )}
          {poi.hours && (
            <MetaRow icon="🕐" label="Hours" value={poi.hours} />
          )}
          {poi.price && (
            <MetaRow icon="💰" label="Price" value={poi.price} />
          )}
          <MetaRow icon="🗺️" label="Region" value={poi.region} />
        </div>

        {/* Tags */}
        {poi.tags && poi.tags.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Tags</div>
            <div className="flex flex-wrap gap-1.5">
              {poi.tags.map(tag => (
                <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-white/5 text-gray-400 border border-white/5">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <a
            href={mapsDirectionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="col-span-2 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90 active:opacity-80"
            style={{ background: color, color: 'white' }}
          >
            🧭 Get Directions
          </a>
          <a
            href={mapsPlaceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border border-white/10 hover:bg-white/8 transition-colors text-gray-300"
          >
            🗺️ View on Maps
          </a>
          {wiki.wikiUrl ? (
            <a
              href={wiki.wikiUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border border-white/10 hover:bg-white/8 transition-colors text-gray-300"
            >
              📖 Wikipedia
            </a>
          ) : <div />}
        </div>
      </div>
    </div>
  );
}

function MetaRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 py-2 border-b border-white/5 last:border-0">
      <span className="text-sm w-5 flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-gray-600 font-medium uppercase tracking-wider">{label}</div>
        <div className="text-sm text-gray-300 mt-0.5">{value}</div>
      </div>
    </div>
  );
}
