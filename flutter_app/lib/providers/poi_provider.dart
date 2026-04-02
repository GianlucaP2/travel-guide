import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:travel_guide/models/poi.dart';
import 'package:travel_guide/providers/auth_provider.dart';

class PoiState {
  final List<POI> pois;
  final bool loading;
  final String? error;

  const PoiState({this.pois = const [], this.loading = false, this.error});
}

class PoiNotifier extends StateNotifier<PoiState> {
  final Ref _ref;

  PoiNotifier(this._ref) : super(const PoiState(loading: true)) {
    _fetchPois();
  }

  Future<void> _fetchPois() async {
    try {
      final api = _ref.read(apiServiceProvider);
      final response = await api.dio.get('/api/pois');
      final pois = (response.data as List).map((j) => POI.fromJson(j)).toList();
      state = PoiState(pois: pois);
    } catch (e) {
      state = PoiState(error: e.toString());
    }
  }

  Future<void> refresh() async {
    state = const PoiState(loading: true);
    await _fetchPois();
  }
}

final poiProvider = StateNotifierProvider<PoiNotifier, PoiState>((ref) {
  return PoiNotifier(ref);
});
