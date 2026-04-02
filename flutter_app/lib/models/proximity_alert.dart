import 'package:travel_guide/models/poi.dart';

class ProximityAlert {
  final String id;
  final POI poi;
  final double distance;
  final int etaMinutes;
  final String navigationUrl;
  final DateTime createdAt;

  const ProximityAlert({
    required this.id,
    required this.poi,
    required this.distance,
    required this.etaMinutes,
    required this.navigationUrl,
    required this.createdAt,
  });
}
