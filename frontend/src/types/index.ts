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
