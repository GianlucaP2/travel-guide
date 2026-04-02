import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:travel_guide/models/gps_state.dart';
import 'package:travel_guide/services/gps_service.dart';

final gpsServiceProvider = Provider<GpsService>((ref) {
  final service = GpsService();
  ref.onDispose(() => service.dispose());
  return service;
});

class GpsNotifier extends StateNotifier<GPSState> {
  final GpsService _service;
  StreamSubscription? _sub;

  GpsNotifier(this._service) : super(const GPSState());

  Future<void> startTracking() async {
    final ok = await _service.startTracking();
    if (ok) {
      _sub = _service.positionStream.listen((gpsState) {
        state = gpsState.copyWith(following: state.following);
      });
      state = state.copyWith(tracking: true, following: true);
    }
  }

  void stopTracking() {
    _sub?.cancel();
    _service.stopTracking();
    state = const GPSState();
  }

  void setFollowing(bool following) {
    state = state.copyWith(following: following);
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }
}

final gpsProvider = StateNotifierProvider<GpsNotifier, GPSState>((ref) {
  return GpsNotifier(ref.read(gpsServiceProvider));
});
