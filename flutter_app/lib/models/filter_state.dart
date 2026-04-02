class FilterState {
  final Set<String> categories;
  final Set<int> tiers;
  final Set<String> regions;
  final String search;

  const FilterState({
    this.categories = const {},
    this.tiers = const {},
    this.regions = const {},
    this.search = '',
  });

  FilterState copyWith({
    Set<String>? categories,
    Set<int>? tiers,
    Set<String>? regions,
    String? search,
  }) {
    return FilterState(
      categories: categories ?? this.categories,
      tiers: tiers ?? this.tiers,
      regions: regions ?? this.regions,
      search: search ?? this.search,
    );
  }

  bool get hasActiveFilters =>
      categories.isNotEmpty || tiers.isNotEmpty || regions.isNotEmpty || search.isNotEmpty;

  int get activeFilterCount =>
      categories.length + tiers.length + regions.length + (search.isNotEmpty ? 1 : 0);

  Map<String, dynamic> toJson() => {
        'categories': categories.toList(),
        'tiers': tiers.toList(),
        'regions': regions.toList(),
        'search': search,
      };

  factory FilterState.fromJson(Map<String, dynamic> json) {
    return FilterState(
      categories: Set<String>.from(json['categories'] ?? []),
      tiers: Set<int>.from((json['tiers'] as List?)?.map((e) => e as int) ?? []),
      regions: Set<String>.from(json['regions'] ?? []),
      search: json['search'] as String? ?? '',
    );
  }
}
