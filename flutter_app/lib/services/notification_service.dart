import 'dart:math';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:travel_guide/config/constants.dart';
import 'package:travel_guide/models/poi.dart';
import 'package:travel_guide/models/proximity_alert.dart';

class NotificationService {
  final FlutterLocalNotificationsPlugin _plugin = FlutterLocalNotificationsPlugin();
  bool _initialized = false;

  Future<void> initialize() async {
    if (_initialized) return;
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const darwinSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );
    const settings = InitializationSettings(android: androidSettings, iOS: darwinSettings, macOS: darwinSettings);
    await _plugin.initialize(settings);
    _initialized = true;
  }

  Future<void> showProximityAlert(ProximityAlert alert) async {
    await initialize();
    final emoji = categoryEmoji[alert.poi.category] ?? '';
    final tier = tierBadge(alert.poi.tier);

    await _plugin.show(
      alert.poi.id.hashCode,
      '$emoji ${alert.poi.name}',
      '${alert.etaMinutes} min away \u00b7 $tier \u00b7 ${alert.poi.region}',
      NotificationDetails(
        android: AndroidNotificationDetails(
          'proximity_alerts',
          'Proximity Alerts',
          channelDescription: 'Alerts when approaching points of interest',
          importance: alert.poi.tier <= 2 ? Importance.high : Importance.defaultImportance,
          priority: alert.poi.tier <= 2 ? Priority.high : Priority.defaultPriority,
        ),
        iOS: DarwinNotificationDetails(
          presentAlert: true,
          interruptionLevel: alert.poi.tier <= 2
              ? InterruptionLevel.timeSensitive
              : InterruptionLevel.active,
        ),
      ),
    );
  }

  /// Haversine distance in meters
  static double haversineDistance(double lat1, double lng1, double lat2, double lng2) {
    const R = 6371000.0; // Earth radius in meters
    final dLat = _toRad(lat2 - lat1);
    final dLng = _toRad(lng2 - lng1);
    final a = sin(dLat / 2) * sin(dLat / 2) +
        cos(_toRad(lat1)) * cos(_toRad(lat2)) * sin(dLng / 2) * sin(dLng / 2);
    final c = 2 * atan2(sqrt(a), sqrt(1 - a));
    return R * c;
  }

  static double _toRad(double deg) => deg * pi / 180;

  /// Calculate alert radius based on speed (same logic as React app)
  /// Returns radius in meters
  static double alertRadius(double? speedMs) {
    // Fallback: 80 km/h = 22.22 m/s
    final speed = (speedMs != null && speedMs > 0) ? speedMs : 22.22;
    // 10 minutes of travel
    final radius = speed * 600; // 10 min in seconds
    // Clamp between 3km and 25km
    return radius.clamp(3000.0, 25000.0);
  }
}
