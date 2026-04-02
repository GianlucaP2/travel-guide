export type Tier = 0 | 1 | 2 | 3 | 4;  // 0 = iconic must-see

export type Category =
  | 'beach'
  | 'viewpoint'
  | 'restaurant'
  | 'bar'
  | 'museum'
  | 'landmark'
  | 'nature'
  | 'experience'
  | 'camping'
  | 'shopping'
  | 'accommodation';

export type BudgetLevel = 1 | 2 | 3 | 4;

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
  bestTime?: string;  // 'morning' | 'lunch' | 'afternoon' | 'sunset' | 'evening' | 'night'
  lat: number;
  lng: number;
  description: string;
  tips?: string;
  address?: string;
  hours?: string;
  price?: string;
  tags?: string[];
  region: Region;
  distanceFromSF?: number; // approx miles from SF
}
