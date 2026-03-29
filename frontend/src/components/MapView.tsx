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
import { useWikipediaData } from '../hooks/useWikipediaData';
import L from 'leaflet';
import { POI } from '../types';
import { GPSState } from '../types';
import { useHwy1Route } from '../hooks/useHwy1Route';
import { CATEGORY_EMOJI, tierColor } from '../utils/markers';

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
}

export default function MapView({ pois, selectedPOI, onSelectPOI, gps, onStopFollowing }: MapViewProps) {
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
          zIndexOffset={poi.tier === 1 ? 1000 : poi.tier === 2 ? 500 : 0}
          eventHandlers={{
            click: () => onSelectPOI(poi),
          }}
        >
          <Popup minWidth={220} maxWidth={280}>
            <POIPopup poi={poi} onExpand={() => onSelectPOI(poi)} />
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

// ── Compact popup card inside the Leaflet popup ──────────────────────────────
function POIPopup({ poi, onExpand }: { poi: POI; onExpand: () => void }) {
  const tierLabels: Record<number, string> = { 1: 'Must-See', 2: 'Recommended', 3: 'Worth a visit', 4: 'If passing by' };
  const wiki = useWikipediaData(poi.name, poi.region, poi.lat, poi.lng);

  return (
    <div className="min-w-[220px] max-w-[280px] overflow-hidden">
      {/* Wikipedia thumbnail */}
      <div className="w-full h-28 bg-white/5 overflow-hidden relative -mx-[1px] -mt-[1px] mb-3 rounded-t-[7px]">
        {wiki.loading && <div className="absolute inset-0 animate-pulse bg-white/5" />}
        {wiki.imageUrl && (
          <img src={wiki.imageUrl} alt={poi.name} className="w-full h-full object-cover" loading="lazy" />
        )}
        {!wiki.loading && !wiki.imageUrl && (
          <div className="absolute inset-0 flex items-center justify-center opacity-20">
            <span className="text-4xl">{CATEGORY_EMOJI[poi.category]}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      </div>
      <div className="p-3 pt-0">
        <div className="flex items-start gap-2 mb-2">
          <span className="text-2xl">{CATEGORY_EMOJI[poi.category]}</span>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm leading-tight text-white pr-4">{poi.name}</div>
            <div className="text-xs mt-0.5" style={{ color: tierColor(poi.tier) }}>
              {'★'.repeat(5 - poi.tier)}{'☆'.repeat(poi.tier - 1)} {tierLabels[poi.tier]}
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
