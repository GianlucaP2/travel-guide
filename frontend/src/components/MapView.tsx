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
import { HWY1_ROUTE } from '../data/route';
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
function MapFollower({ gps }: { gps: GPSState }) {
  const map = useMap();
  React.useEffect(() => {
    if (gps.following && gps.lat !== null && gps.lng !== null) {
      map.setView([gps.lat, gps.lng], Math.max(map.getZoom(), 13), { animate: true });
    }
  }, [gps.lat, gps.lng, gps.following, map]);
  return null;
}

// ── Center on selected POI ───────────────────────────────────────────────────
function PanTo({ poi }: { poi: POI | null }) {
  const map = useMap();
  React.useEffect(() => {
    if (poi) {
      map.setView([poi.lat, poi.lng], Math.max(map.getZoom(), 14), { animate: true });
    }
  }, [poi, map]);
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
}

export default function MapView({ pois, selectedPOI, onSelectPOI, gps }: MapViewProps) {
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

      {/* Hwy 1 route polyline */}
      <Polyline
        positions={HWY1_ROUTE}
        pathOptions={{
          color: '#60a5fa',
          weight: 3,
          opacity: 0.65,
          dashArray: '10 6',
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
          <Popup>
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

      <MapFollower gps={gps} />
      <PanTo poi={selectedPOI} />
    </MapContainer>
  );
}

// ── Compact popup card inside the Leaflet popup ──────────────────────────────
function POIPopup({ poi, onExpand }: { poi: POI; onExpand: () => void }) {
  const tierLabels: Record<number, string> = { 1: 'Must-See', 2: 'Recommended', 3: 'Worth a visit', 4: 'If passing by' };
  return (
    <div className="p-3 min-w-[220px] max-w-[280px]">
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
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-gray-500">{poi.region}</span>
        <button
          onClick={onExpand}
          className="text-xs px-2.5 py-1 rounded-lg font-medium transition-colors"
          style={{ background: tierColor(poi.tier) + '33', color: tierColor(poi.tier), border: `1px solid ${tierColor(poi.tier)}66` }}
        >
          Details →
        </button>
      </div>
    </div>
  );
}
