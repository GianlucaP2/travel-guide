import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:travel_guide/providers/auth_provider.dart';

class FavoritesState {
  final Set<String> favoriteIds;
  final bool loading;

  const FavoritesState({this.favoriteIds = const {}, this.loading = false});
}

class FavoritesNotifier extends StateNotifier<FavoritesState> {
  final Ref _ref;

  FavoritesNotifier(this._ref) : super(const FavoritesState()) {
    _load();
  }

  Future<void> _load() async {
    final auth = _ref.read(authProvider);
    if (!auth.isAuthenticated) return;

    try {
      final api = _ref.read(apiServiceProvider);
      final response = await api.dio.get('/api/favorites');
      final ids = (response.data as List).map((f) => f['poi_id'] as String).toSet();
      state = FavoritesState(favoriteIds: ids);
    } catch (_) {}
  }

  Future<void> toggle(String poiId) async {
    final auth = _ref.read(authProvider);
    if (!auth.isAuthenticated) return;

    final api = _ref.read(apiServiceProvider);
    final ids = Set<String>.from(state.favoriteIds);

    if (ids.contains(poiId)) {
      ids.remove(poiId);
      state = FavoritesState(favoriteIds: ids);
      try {
        await api.dio.delete('/api/favorites/$poiId');
      } catch (_) {
        ids.add(poiId);
        state = FavoritesState(favoriteIds: ids);
      }
    } else {
      ids.add(poiId);
      state = FavoritesState(favoriteIds: ids);
      try {
        await api.dio.post('/api/favorites/$poiId');
      } catch (_) {
        ids.remove(poiId);
        state = FavoritesState(favoriteIds: ids);
      }
    }
  }

  bool isFavorite(String poiId) => state.favoriteIds.contains(poiId);
}

final favoritesProvider = StateNotifierProvider<FavoritesNotifier, FavoritesState>((ref) {
  return FavoritesNotifier(ref);
});
