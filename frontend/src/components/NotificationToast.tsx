import React, { useEffect } from 'react';
import { ProximityAlert } from '../hooks/useProximityNotifications';
import { CATEGORY_EMOJI, tierColor } from '../utils/markers';

interface Props {
  alerts: ProximityAlert[];
  onDismiss: (id: string) => void;
}

/**
 * Floating in-app toast stack for proximity alerts.
 * Works even when the browser blocks OS notifications (iOS Safari, etc.).
 * Auto-dismisses after 20 s for Tier 3/4; stays until tapped for Tier 1/2.
 */
export default function NotificationToast({ alerts, onDismiss }: Props) {
  // Auto-dismiss lower-tier alerts
  useEffect(() => {
    if (alerts.length === 0) return;
    const last = alerts[alerts.length - 1];
    if (last.poi.tier <= 2) return; // keep must-see/recommended until dismissed
    const t = setTimeout(() => onDismiss(last.id), 20_000);
    return () => clearTimeout(t);
  }, [alerts, onDismiss]);

  if (alerts.length === 0) return null;

  return (
    <div className="fixed top-16 right-3 z-[4000] flex flex-col gap-2 pointer-events-none" style={{ maxWidth: 320 }}>
      {alerts.slice(-3).map(alert => {
        const color = tierColor(alert.poi.tier);
        const icon = CATEGORY_EMOJI[alert.poi.category] ?? '📍';
        return (
          <div
            key={alert.id}
            className="toast-slide-in pointer-events-auto flex flex-col rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: 'rgba(10,16,28,0.96)', border: `1px solid ${color}55`, backdropFilter: 'blur(16px)' }}
          >
            {/* Colour accent */}
            <div className="h-0.5 flex-shrink-0" style={{ background: `linear-gradient(to right, ${color}, ${color}55)` }} />

            <div className="p-3 flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-xl"
                style={{ background: color + '22', border: `1px solid ${color}44` }}
              >
                {icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-bold text-white truncate">{alert.poi.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0"
                    style={{ background: color + 'cc', color: 'white' }}>
                    ~{alert.etaMin} min
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 leading-snug">{alert.poi.region}</p>
              </div>
              <button
                onClick={() => onDismiss(alert.id)}
                className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-gray-500 hover:text-white hover:bg-white/10 transition-colors text-xs"
              >✕</button>
            </div>

            {/* Action buttons */}
            <div className="flex border-t border-white/5">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(alert.poi.address ?? alert.poi.name + ', ' + alert.poi.region + ', CA')}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onDismiss(alert.id)}
                className="flex-1 py-2.5 text-center text-xs font-medium text-gray-400 hover:bg-white/5 transition-colors border-r border-white/5"
              >
                📍 View
              </a>
              <a
                href={alert.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onDismiss(alert.id)}
                className="flex-1 py-2.5 text-center text-xs font-semibold transition-colors hover:opacity-90"
                style={{ color: color }}
              >
                🧭 Route There
              </a>
            </div>
          </div>
        );
      })}
    </div>
  );
}
