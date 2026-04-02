export type Tier = 1 | 2 | 3 | 4;

export type Category =
  | 'beach'
  | 'viewpoint'
  | 'restaurant'
  | 'bar'
  | 'landmark'
  | 'nature'
  | 'experience'
  | 'camping'
  | 'shopping'
  | 'accommodation';

export type Region =
  | 'San Francisco'
  | 'Pacifica'
  | 'Half Moon Bay'
  | 'Santa Cruz'
  | 'Monterey'
  | 'Pacific Grove'
  | 'Pebble Beach'
  | 'Carmel'
  | 'Big Sur'
  | 'San Simeon'
  | 'Cambria'
  | 'Cayucos'
  | 'Morro Bay'
  | 'San Luis Obispo'
  | 'Pismo Beach'
  | 'Gaviota'
  | 'Santa Barbara'
  | 'Ventura'
  | 'Malibu'
  | 'Santa Monica / LA'
  | 'Los Angeles'
  | 'Hollywood'
  | 'West Hollywood'
  | 'Downtown LA'
  | 'Arts District'
  | 'Los Feliz / Silver Lake'
  | 'Beverly Hills'
  | 'Joshua Tree'
  | 'Palm Springs';

export interface POI {
  id: string;
  name: string;
  category: Category;
  tier: Tier;
  lat: number;
  lng: number;
  description: string;
  tips?: string;
  address?: string;
  hours?: string;
  price?: string;
  tags?: string[];
  region: Region;
  distanceFromSF?: number;
}

// ─── AI Trip Planner ─────────────────────────────────────────────────────────

export interface PlanSlot {
  poiId: string;
  poiName: string;
  startTime: string; // "09:30"
  endTime: string;   // "11:00"
  notes?: string;
  done: boolean;
}

export interface DayPlan {
  date: string;   // "2025-04-02"
  label: string;  // "Day 1 — Thursday, April 2"
  slots: PlanSlot[];
}

export interface TripPlan {
  id: string;
  zone: string;
  days: DayPlan[];
  createdAt: string;
  startHour: string;
  endHour: string;
  nightLife: boolean;
  nightEndHour: string; // e.g. "00:00" = midnight
}

export interface PlannerConfig {
  zone: string;
  startDate: string; // "YYYY-MM-DD"
  endDate: string;   // "YYYY-MM-DD"
  startHour: string; // "09:00"
  endHour: string;   // "21:00"
  nightLife: boolean;    // include dinner + after-dinner bars/rooftops
  nightEndHour: string;  // e.g. "00:00" = midnight, "02:00" = 2am
}

// ─── GPS ─────────────────────────────────────────────────────────────────────

export interface GPSState {
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  timestamp: number | null;
  error: string | null;
  tracking: boolean;
  following: boolean;
}
