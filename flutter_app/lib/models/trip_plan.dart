class PlanSlot {
  final String poiId;
  final String poiName;
  final String startTime;
  final String endTime;
  final String? notes;
  bool done;

  PlanSlot({
    required this.poiId,
    required this.poiName,
    required this.startTime,
    required this.endTime,
    this.notes,
    this.done = false,
  });

  factory PlanSlot.fromJson(Map<String, dynamic> json) {
    return PlanSlot(
      poiId: json['poiId'] as String,
      poiName: json['poiName'] as String,
      startTime: json['startTime'] as String,
      endTime: json['endTime'] as String,
      notes: json['notes'] as String?,
      done: json['done'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() => {
        'poiId': poiId,
        'poiName': poiName,
        'startTime': startTime,
        'endTime': endTime,
        'notes': notes,
        'done': done,
      };
}

class DayPlan {
  final String date;
  final String label;
  final List<PlanSlot> slots;

  DayPlan({required this.date, required this.label, required this.slots});

  factory DayPlan.fromJson(Map<String, dynamic> json) {
    return DayPlan(
      date: json['date'] as String,
      label: json['label'] as String,
      slots: (json['slots'] as List).map((s) => PlanSlot.fromJson(s)).toList(),
    );
  }

  Map<String, dynamic> toJson() => {
        'date': date,
        'label': label,
        'slots': slots.map((s) => s.toJson()).toList(),
      };
}

class TripPlan {
  final String id;
  final String zone;
  final List<DayPlan> days;
  final String createdAt;
  final String startHour;
  final String endHour;

  TripPlan({
    required this.id,
    required this.zone,
    required this.days,
    required this.createdAt,
    required this.startHour,
    required this.endHour,
  });

  factory TripPlan.fromJson(Map<String, dynamic> json) {
    final planData = json['plan_data'] as Map<String, dynamic>?;
    final days = planData != null
        ? (planData['days'] as List).map((d) => DayPlan.fromJson(d)).toList()
        : (json['days'] as List).map((d) => DayPlan.fromJson(d)).toList();

    return TripPlan(
      id: json['id']?.toString() ?? DateTime.now().millisecondsSinceEpoch.toString(),
      zone: json['zone'] as String? ?? '',
      days: days,
      createdAt: json['created_at']?.toString() ?? json['createdAt']?.toString() ?? '',
      startHour: json['start_hour'] as String? ?? json['startHour'] as String? ?? '09:00',
      endHour: json['end_hour'] as String? ?? json['endHour'] as String? ?? '21:00',
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'zone': zone,
        'days': days.map((d) => d.toJson()).toList(),
        'createdAt': createdAt,
        'startHour': startHour,
        'endHour': endHour,
      };
}

class PlannerConfig {
  String zone;
  String startDate;
  String endDate;
  String startHour;
  String endHour;

  PlannerConfig({
    this.zone = 'Santa Monica',
    this.startDate = '',
    this.endDate = '',
    this.startHour = '09:00',
    this.endHour = '21:00',
  });
}
