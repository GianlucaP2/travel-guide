import 'package:travel_guide/models/poi.dart';
import 'package:travel_guide/models/trip_plan.dart';
import 'package:travel_guide/services/api_service.dart';

class PlannerService {
  final ApiService _api;

  PlannerService(this._api);

  Future<List<DayPlan>> generate({
    required String zone,
    required List<String> dates,
    required String startHour,
    required String endHour,
    required List<POI> pois,
  }) async {
    final response = await _api.dio.post('/api/planner/generate', data: {
      'zone': zone,
      'dates': dates,
      'startHour': startHour,
      'endHour': endHour,
      'pois': pois
          .map((p) => {
                'id': p.id,
                'name': p.name,
                'category': p.category,
                'tier': p.tier,
                'region': p.region,
                'address': p.address,
                'hours': p.hours,
                'price': p.price,
                'lat': p.lat,
                'lng': p.lng,
              })
          .toList(),
    });

    final days = (response.data['days'] as List)
        .map((d) => DayPlan.fromJson(d as Map<String, dynamic>))
        .toList();
    return days;
  }

  Future<List<DayPlan>> replan({
    required List<String> completed,
    required List<DayPlan> remaining,
    required String currentTime,
    required String currentDate,
  }) async {
    final response = await _api.dio.post('/api/planner/replan', data: {
      'completed': completed,
      'remaining': remaining.map((d) => d.toJson()).toList(),
      'currentTime': currentTime,
      'currentDate': currentDate,
    });

    final days = (response.data['days'] as List)
        .map((d) => DayPlan.fromJson(d as Map<String, dynamic>))
        .toList();
    return days;
  }
}
