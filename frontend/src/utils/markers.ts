import { Category, Tier } from '../types';

export const CATEGORY_EMOJI: Record<Category, string> = {
  beach: '🏖️',
  viewpoint: '👁️',
  restaurant: '🍽️',
  bar: '🍸',
  museum: '🏛️',
  landmark: '🗺️',
  nature: '🌿',
  experience: '🎯',
  camping: '⛺',
  shopping: '🛍️',
  accommodation: '🏨',
};

export const CATEGORY_LABEL: Record<Category, string> = {
  beach: 'Beach',
  viewpoint: 'Viewpoint',
  restaurant: 'Restaurant',
  bar: 'Bar & Drinks',
  museum: 'Museum',
  landmark: 'Landmark',
  nature: 'Nature',
  experience: 'Experience',
  camping: 'Camping',
  shopping: 'Shopping',
  accommodation: 'Stay',
};

export function tierColor(tier: Tier): string {
  switch (tier) {
    case 0: return '#fbbf24';   // gold — iconic
    case 1: return '#ef4444';   // red
    case 2: return '#f97316';   // orange
    case 3: return '#0ea5e9';   // sky blue
    case 4: return '#6b7280';   // gray
    default: return '#6b7280';
  }
}

export function tierLabel(tier: Tier): string {
  switch (tier) {
    case 0: return '⭐ Iconic';
    case 1: return '★★★★ Top Pick';
    case 2: return '★★★  Recommended';
    case 3: return '★★   Worth a visit';
    case 4: return '★    If passing by';
    default: return '';
  }
}

export function tierBadge(tier: Tier): string {
  switch (tier) {
    case 0: return '⭐ Iconic';
    case 1: return 'Top Pick';
    case 2: return 'Recommended';
    case 3: return 'Worth a visit';
    case 4: return 'If passing by';
    default: return '';
  }
}
