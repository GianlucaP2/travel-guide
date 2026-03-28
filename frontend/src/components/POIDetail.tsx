import React from 'react';
import { POI } from '../types';
import { CATEGORY_EMOJI, CATEGORY_LABEL, tierColor, tierBadge } from '../utils/markers';

interface POIDetailProps {
  poi: POI;
  onClose: () => void;
}

export default function POIDetail({ poi, onClose }: POIDetailProps) {
  const color = tierColor(poi.tier);

  return (
    <div className="glass flex flex-col max-h-[85vh] md:max-h-full overflow-hidden rounded-t-2xl md:rounded-none">
      {/* Header bar with color accent */}
      <div
        className="flex-shrink-0 h-1"
        style={{ background: `linear-gradient(to right, ${color}, ${color}88)` }}
      />

      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-white/5">
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
              <span
                className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{ background: color + '25', color }}
              >
                {tierBadge(poi.tier)}
              </span>
              <span className="text-xs text-gray-500">{CATEGORY_LABEL[poi.category]}</span>
              {poi.price && (
                <span className="text-xs text-gray-500">{poi.price}</span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors text-sm"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Description */}
        <p className="text-gray-300 text-sm leading-relaxed">{poi.description}</p>

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

        {/* Directions button */}
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${poi.lat},${poi.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90 active:opacity-80"
          style={{ background: color, color: 'white' }}
        >
          🗺️ Open in Google Maps
        </a>
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
