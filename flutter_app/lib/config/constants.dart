const Map<String, String> categoryEmoji = {
  'beach': '\u{1F3D6}\u{FE0F}',
  'viewpoint': '\u{1F441}\u{FE0F}',
  'restaurant': '\u{1F37D}\u{FE0F}',
  'bar': '\u{1F378}',
  'landmark': '\u{1F3DB}\u{FE0F}',
  'nature': '\u{1F33F}',
  'experience': '\u{1F3AF}',
  'camping': '\u{26FA}',
  'shopping': '\u{1F6CD}\u{FE0F}',
  'accommodation': '\u{1F3E8}',
};

const Map<String, String> categoryLabel = {
  'beach': 'Beach',
  'viewpoint': 'Viewpoint',
  'restaurant': 'Restaurant',
  'bar': 'Bar',
  'landmark': 'Landmark',
  'nature': 'Nature',
  'experience': 'Experience',
  'camping': 'Camping',
  'shopping': 'Shopping',
  'accommodation': 'Accommodation',
};

String tierLabel(int tier) {
  switch (tier) {
    case 1:
      return '\u2605\u2605\u2605\u2605 Must-See';
    case 2:
      return '\u2605\u2605\u2605  Recommended';
    case 3:
      return '\u2605\u2605   Worth a visit';
    case 4:
      return '\u2605    If passing by';
    default:
      return '';
  }
}

String tierBadge(int tier) {
  switch (tier) {
    case 1:
      return 'Must-See';
    case 2:
      return 'Recommended';
    case 3:
      return 'Worth a visit';
    case 4:
      return 'If passing by';
    default:
      return '';
  }
}

const List<String> allCategories = [
  'beach', 'viewpoint', 'restaurant', 'bar', 'landmark',
  'nature', 'experience', 'camping', 'shopping', 'accommodation',
];

const List<String> allRegions = [
  'San Francisco', 'Pacifica', 'Half Moon Bay', 'Santa Cruz',
  'Monterey', 'Pacific Grove', 'Pebble Beach', 'Carmel', 'Big Sur',
  'San Simeon', 'Cambria', 'Cayucos', 'Morro Bay', 'San Luis Obispo',
  'Pismo Beach', 'Gaviota', 'Santa Barbara', 'Ventura', 'Malibu',
  'Santa Monica / LA', 'Los Angeles', 'Hollywood', 'West Hollywood',
  'Downtown LA', 'Arts District', 'Los Feliz / Silver Lake',
  'Beverly Hills', 'Joshua Tree', 'Palm Springs',
];

const List<String> laRegions = [
  'Santa Monica / LA', 'Los Angeles', 'Hollywood', 'West Hollywood',
  'Downtown LA', 'Arts District', 'Los Feliz / Silver Lake',
  'Beverly Hills', 'Joshua Tree', 'Palm Springs',
];

const List<String> plannerZones = [
  'Santa Monica', 'Venice Beach', 'Beverly Hills', 'West Hollywood',
  'Hollywood', 'Downtown LA', 'Los Feliz / Silver Lake',
];
