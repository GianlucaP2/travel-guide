import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:travel_guide/models/gps_state.dart';
import 'package:travel_guide/models/poi.dart';
import 'package:travel_guide/models/proximity_alert.dart';
import 'package:travel_guide/providers/gps_provider.dart';
import 'package:travel_guide/providers/poi_provider.dart';
import 'package:travel_guide/services/notification_service.dart';

class ProximityState {
  final List<ProximityAlert> alerts;

  const ProximityState({this.alerts = const []});
}

class ProximityNotifier extends StateNotifier<ProximityState> {
  final Ref _ref;
  final NotificationService _notificationService = NotificationService();
  final Set<String> _notifiedIds = {};

  ProximityNotifier(this._ref) : super(const ProximityState()) {
    _ref.listen(gpsProvider, (prev, next) {
      _onGpsUpdate(next);
    });
  }

  void _onGpsUpdate(GPSState gps) {
    if (!gps.tracking || !gps.hasPosition) {
      if (!gps.tracking) {
        state = const ProximityState();
        _notifiedIds.clear();
      }
      return;
    }

    final pois = _ref.read(poiProvider).pois;
    final newAlerts = <ProximityAlert>[];

    final radius = NotificationService.alertRadius(gps.speed);

    for (final poi in pois) {
      if (_notifiedIds.contains(poi.id)) continue;

      final distance = NotificationService.haversineDistance(
        gps.lat!, gps.lng!, poi.lat, poi.lng,
      );

      if (distance < radius) {
        final speed = (gps.speed != null && gps.speed! > 0) ? gps.speed! : 22.22;
        final etaMinutes = (distance / speed / 60).round().clamp(1, 999);

        final navUrl = 'https://www.google.com/maps/dir/${gps.lat},${gps.lng}/${poi.lat},${poi.lng}';

        final alert = ProximityAlert(
          id: poi.id,
          poi: poi,
          distance: distance,
          etaMinutes: etaMinutes,
          navigationUrl: navUrl,
          createdAt: DateTime.now(),
        );

        newAlerts.add(alert);
        _notifiedIds.add(poi.id);
        _notificationService.showProximityAlert(alert);
      }
    }

    if (newAlerts.isNotEmpty) {
      state = ProximityState(alerts: [...state.alerts, ...newAlerts]);
    }
  }

  void dismissAlert(String poiId) {
    state = ProximityState(
      alerts: state.alerts.where((a) => a.id != poiId).toList(),
    );
  }
}

final proximityProvider = StateNotifierProvider<ProximityNotifier, ProximityState>((ref) {
  return ProximityNotifier(ref);
});
