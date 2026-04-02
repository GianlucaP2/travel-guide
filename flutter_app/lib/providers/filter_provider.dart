import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:travel_guide/models/filter_state.dart';
import 'package:travel_guide/models/poi.dart';
import 'package:travel_guide/providers/poi_provider.dart';

class FilterNotifier extends StateNotifier<FilterState> {
  FilterNotifier() : super(const FilterState()) {
    _loadFromStorage();
  }

  Future<void> _loadFromStorage() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final json = prefs.getString('tg_filters_v1');
      if (json != null) {
        state = FilterState.fromJson(jsonDecode(json));
      }
    } catch (_) {}
  }

  Future<void> _persist() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('tg_filters_v1', jsonEncode(state.toJson()));
  }

  void toggleCategory(String category) {
    final cats = Set<String>.from(state.categories);
    cats.contains(category) ? cats.remove(category) : cats.add(category);
    state = state.copyWith(categories: cats);
    _persist();
  }

  void toggleTier(int tier) {
    final tiers = Set<int>.from(state.tiers);
    tiers.contains(tier) ? tiers.remove(tier) : tiers.add(tier);
    state = state.copyWith(tiers: tiers);
    _persist();
  }

  void toggleRegion(String region) {
    final regions = Set<String>.from(state.regions);
    regions.contains(region) ? regions.remove(region) : regions.add(region);
    state = state.copyWith(regions: regions);
    _persist();
  }

  void setSearch(String search) {
    state = state.copyWith(search: search);
    _persist();
  }

  void clearFilters() {
    state = const FilterState();
    _persist();
  }
}

final filterProvider = StateNotifierProvider<FilterNotifier, FilterState>((ref) {
  return FilterNotifier();
});

final filteredPoisProvider = Provider<List<POI>>((ref) {
  final poiState = ref.watch(poiProvider);
  final filters = ref.watch(filterProvider);

  if (poiState.loading || poiState.pois.isEmpty) return [];

  return poiState.pois.where((poi) {
    if (filters.categories.isNotEmpty && !filters.categories.contains(poi.category)) return false;
    if (filters.tiers.isNotEmpty && !filters.tiers.contains(poi.tier)) return false;
    if (filters.regions.isNotEmpty && !filters.regions.contains(poi.region)) return false;
    if (filters.search.isNotEmpty) {
      final q = filters.search.toLowerCase();
      final searchable = '${poi.name} ${poi.description} ${poi.region} ${poi.tags?.join(' ') ?? ''}'.toLowerCase();
      if (!searchable.contains(q)) return false;
    }
    return true;
  }).toList();
});
