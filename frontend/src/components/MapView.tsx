import React from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Circle,
  useMap,
  ZoomControl,
} from 'react-leaflet';
import L from 'leaflet';
import { POI } from '../types';
import { GPSState } from '../types';
import { useHwy1Route } from '../hooks/useHwy1Route';
import { useWikipediaData } from '../hooks/useWikipediaData';
import { CATEGORY_EMOJI, tierColor } from '../utils/markers';
import { LA_EVENTS, STATUS_CONFIG, type LAEvent } from '../data/events';

// ── Fix Leaflet default icon paths ──────────────────────────────────────────
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// ── Auto-follow GPS position ─────────────────────────────────────────────────
function MapFollower({ gps, onStopFollowing }: { gps: GPSState; onStopFollowing: () => void }) {
  const map = useMap();
  // Unfollow when user manually drags the map
  React.useEffect(() => {
    const stop = () => onStopFollowing();
    map.on('dragstart', stop);
    return () => { map.off('dragstart', stop); };
  }, [map, onStopFollowing]);
  React.useEffect(() => {
    if (gps.following && gps.lat !== null && gps.lng !== null) {
      map.setView([gps.lat, gps.lng], Math.max(map.getZoom(), 13), { animate: true });
    }
  }, [gps.lat, gps.lng, gps.following, map]);
  return null;
}

// ── Center on selected POI ───────────────────────────────────────────────────
function PanTo({ poi, onStopFollowing }: { poi: POI | null; onStopFollowing: () => void }) {
  const map = useMap();
  React.useEffect(() => {
    if (poi) {
      onStopFollowing();
      map.closePopup();
      map.setView([poi.lat, poi.lng], Math.max(map.getZoom(), 14), { animate: true });
    }
  }, [poi, map, onStopFollowing]);
  return null;
}

// ── Create DivIcon for a POI ─────────────────────────────────────────────────
function createPOIIcon(poi: POI, selected: boolean) {
  const emoji = CATEGORY_EMOJI[poi.category] ?? '📍';
  const cls = `poi-marker tier-${poi.tier}${selected ? ' selected' : ''}`;
  return L.divIcon({
    html: `<div class="${cls}">${emoji}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    className: '',
  });
}

// ── Create DivIcon for an event marker ───────────────────────────────────────
function createEventIcon(ev: LAEvent, selected: boolean) {
  const emoji = ev.tags.includes('dj') ? '🎵'
    : ev.tags.includes('live-music') ? '🎸'
    : ev.tags.includes('comedy')     ? '😂'
    : ev.tags.includes('beer-fest')  ? '🍺'
    : ev.tags.includes('drag')       ? '👑'
    : ev.tags.includes('cultural')   ? '🌍'
    : ev.tags.includes('wrestling')  ? '🥊'
    : ev.tags.includes('brunch')     ? '🥂'
    : '🎉';
  const pulse = (ev.status === 'almost-full' || ev.status === 'sales-end-soon') ? ' event-pulse' : '';
  const sel = selected ? ' event-selected' : '';
  return L.divIcon({
    html: `<div class="event-marker${sel}${pulse}"><div class="event-pin">${emoji}</div><div class="event-time">${ev.time}</div></div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    className: '',
  });
}

// ── GPS dot icon ─────────────────────────────────────────────────────────────
const GPS_ICON = L.divIcon({
  html: `<div class="gps-marker-outer"><div class="gps-marker-ring"></div><div class="gps-marker-dot"></div></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  className: '',
});

// ── Map component ────────────────────────────────────────────────────────────
interface MapViewProps {
  pois: POI[];
  selectedPOI: POI | null;
  onSelectPOI: (poi: POI | null) => void;
  gps: GPSState;
  onStopFollowing: () => void;
  showEvents?: boolean;
  selectedEventId?: string | null;
  onSelectEvent?: (ev: LAEvent | null) => void;
}

export default function MapView({
  pois, selectedPOI, onSelectPOI,
  gps, onStopFollowing,
  showEvents = true,
  selectedEventId = null,
  onSelectEvent,
}: MapViewProps) {
  const { route, loading } = useHwy1Route();

  return (
    <MapContainer
      center={[37.0, -121.9]}
      zoom={7}
      scrollWheelZoom
      zoomControl={false}
      style={{ width: '100%', height: '100%' }}
    >
      {/* Dark map tile from CartoDB */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        maxZoom={20}
      />

      <ZoomControl position="bottomright" />

      {/* Hwy 1 / PCH route polyline — road-snapped geometry from OSRM */}
      <Polyline
        positions={route}
        pathOptions={{
          color: '#60a5fa',
          weight: loading ? 2 : 3,
          opacity: loading ? 0.35 : 0.7,
          dashArray: loading ? '6 8' : undefined,
        }}
      />

      {/* POI markers */}
      {pois.map(poi => (
        <Marker
          key={poi.id}
          position={[poi.lat, poi.lng]}
          icon={createPOIIcon(poi, selectedPOI?.id === poi.id)}
          zIndexOffset={poi.tier === 0 ? 2000 : poi.tier === 1 ? 1000 : poi.tier === 2 ? 500 : 0}
          eventHandlers={{
            click: () => onSelectPOI(poi),
          }}
        >
          <Popup minWidth={220} maxWidth={280}>
            <POIPopup poi={poi} onExpand={() => onSelectPOI(poi)} isSelected={selectedPOI?.id === poi.id} />
          </Popup>
        </Marker>
      ))}

      {/* Event markers — today's LA events */}
      {showEvents && LA_EVENTS.map(ev => (
        <Marker
          key={`ev-${ev.id}`}
          position={[ev.lat, ev.lng]}
          icon={createEventIcon(ev, selectedEventId === ev.id)}
          zIndexOffset={3000}
          eventHandlers={{
            click: () => onSelectEvent?.(ev),
          }}
        >
          <Popup minWidth={220} maxWidth={300}>
            <EventPopup ev={ev} />
          </Popup>
        </Marker>
      ))}

      {/* GPS position */}
      {gps.lat !== null && gps.lng !== null && (
        <>
          <Marker position={[gps.lat, gps.lng]} icon={GPS_ICON} zIndexOffset={9999} />
          {gps.accuracy && (
            <Circle
              center={[gps.lat, gps.lng]}
              radius={gps.accuracy}
              pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.1, weight: 1 }}
            />
          )}
        </>
      )}

      <MapFollower gps={gps} onStopFollowing={onStopFollowing} />
      <PanTo poi={selectedPOI} onStopFollowing={onStopFollowing} />
    </MapContainer>
  );
}

// ── Event popup card ─────────────────────────────────────────────────────────
function EventPopup({ ev }: { ev: LAEvent }) {
  const statusCfg = STATUS_CONFIG[ev.status];
  return (
    <div className="min-w-[220px] max-w-[300px]">
      <div className="p-3">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-xs font-bold text-blue-400 tabular-nums">{ev.time}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${statusCfg.color}`}>
            {statusCfg.label}
          </span>
        </div>
        <div className="font-semibold text-sm leading-snug text-white mb-1">{ev.name}</div>
        <div className="text-xs text-gray-400 mb-1">📍 {ev.venue} · {ev.area}</div>
        <div className="text-xs font-semibold mb-2" style={{ color: ev.isFree ? '#4ade80' : '#d1d5db' }}>
          {ev.isFree ? '🆓 Free' : ev.price}
        </div>
        {ev.description && (
          <p className="text-xs text-gray-400 leading-relaxed mb-2 line-clamp-2">{ev.description}</p>
        )}
        <a
          href={ev.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center text-xs py-1.5 rounded-lg font-medium transition-colors"
          style={{ background: '#0ea5e933', color: '#38bdf8', border: '1px solid #0ea5e966' }}
        >
          Get tickets →
        </a>
      </div>
    </div>
  );
}

// ── Lazy Wikipedia hero image — only fetches when this popup is open ─────────
function PopupWikiImage({ poi }: { poi: POI }) {
  const wiki = useWikipediaData(poi.name, poi.region, poi.lat, poi.lng);
  if (wiki.loading) {
    return <div className="absolute inset-0 animate-pulse bg-white/5" />;
  }
  if (wiki.imageUrl) {
    return <img src={wiki.imageUrl} alt={poi.name} className="w-full h-full object-cover" loading="lazy" />;
  }
  return (
    <div className="absolute inset-0 flex items-center justify-center opacity-20">
      <span className="text-4xl">{CATEGORY_EMOJI[poi.category]}</span>
    </div>
  );
}

// ── Compact popup card inside the Leaflet popup ──────────────────────────────
function POIPopup({ poi, onExpand, isSelected }: { poi: POI; onExpand: () => void; isSelected: boolean }) {
  const tierLabels: Record<number, string> = { 0: '⭐ Iconic', 1: 'Top Pick', 2: 'Recommended', 3: 'Worth a visit', 4: 'If passing by' };

  return (
    <div className="min-w-[220px] max-w-[280px] overflow-hidden">
      {/* Hero image: only fetches Wikipedia when this popup is selected/open */}
      <div className="w-full h-28 bg-white/5 overflow-hidden relative -mx-[1px] -mt-[1px] mb-3 rounded-t-[7px]">
        {isSelected
          ? <PopupWikiImage poi={poi} />
          : (
            <div className="absolute inset-0 flex items-center justify-center opacity-20">
              <span className="text-4xl">{CATEGORY_EMOJI[poi.category]}</span>
            </div>
          )
        }
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      </div>
      <div className="p-3 pt-0">
        <div className="flex items-start gap-2 mb-2">
          <span className="text-2xl">{CATEGORY_EMOJI[poi.category]}</span>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm leading-tight text-white pr-4">{poi.name}</div>
            <div className="text-xs mt-0.5" style={{ color: tierColor(poi.tier) }}>
              {poi.tier === 0 ? '⭐ Iconic' : tierLabels[poi.tier]}
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-300 leading-relaxed line-clamp-3 mb-3">{poi.description}</p>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-gray-500">{poi.region}</span>
          <div className="flex gap-1">
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(poi.address ?? poi.name + ', ' + poi.region + ', CA')}`}
              target="_blank" rel="noopener noreferrer"
              className="text-xs px-2 py-1 rounded-lg font-medium transition-colors"
              style={{ background: '#ffffff18', color: '#9ca3af', border: '1px solid #ffffff22' }}
            >📍</a>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(poi.address ?? poi.name + ', ' + poi.region + ', CA')}&travelmode=driving&dir_action=navigate`}
              target="_blank" rel="noopener noreferrer"
              className="text-xs px-2 py-1 rounded-lg font-medium transition-colors"
              style={{ background: tierColor(poi.tier) + '33', color: tierColor(poi.tier), border: `1px solid ${tierColor(poi.tier)}66` }}
            >🧭</a>
            <button
              onClick={onExpand}
              className="text-xs px-2.5 py-1 rounded-lg font-medium transition-colors"
              style={{ background: tierColor(poi.tier) + '33', color: tierColor(poi.tier), border: `1px solid ${tierColor(poi.tier)}66` }}
            >
              ···
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
