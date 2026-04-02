import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:travel_guide/config/constants.dart';
import 'package:travel_guide/models/poi.dart';
import 'package:travel_guide/models/trip_plan.dart';
import 'package:travel_guide/providers/auth_provider.dart';
import 'package:travel_guide/providers/poi_provider.dart';
import 'package:travel_guide/services/planner_service.dart';

enum PlannerStatus { idle, loading, ready, error }

class PlannerState {
  final TripPlan? plan;
  final PlannerConfig config;
  final PlannerStatus status;
  final String? error;
  final bool isRescheduling;

  PlannerState({
    this.plan,
    PlannerConfig? config,
    this.status = PlannerStatus.idle,
    this.error,
    this.isRescheduling = false,
  }) : config = config ?? PlannerConfig();

  PlannerState copyWith({
    TripPlan? plan,
    PlannerConfig? config,
    PlannerStatus? status,
    String? error,
    bool? isRescheduling,
  }) {
    return PlannerState(
      plan: plan ?? this.plan,
      config: config ?? this.config,
      status: status ?? this.status,
      error: error,
      isRescheduling: isRescheduling ?? this.isRescheduling,
    );
  }
}

class PlannerNotifier extends StateNotifier<PlannerState> {
  final Ref _ref;
  late final PlannerService _service;

  PlannerNotifier(this._ref) : super(PlannerState()) {
    _service = PlannerService(_ref.read(apiServiceProvider));
    _loadFromStorage();
  }

  List<POI> get laPois {
    final poiState = _ref.read(poiProvider);
    return poiState.pois.where((p) => laRegions.contains(p.region)).toList();
  }

  Future<void> _loadFromStorage() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final json = prefs.getString('tg_plan_v1');
      if (json != null) {
        final data = jsonDecode(json) as Map<String, dynamic>;
        final plan = TripPlan.fromJson(data);
        state = PlannerState(plan: plan, status: PlannerStatus.ready);
      }
    } catch (_) {}
  }

  Future<void> _persist() async {
    final prefs = await SharedPreferences.getInstance();
    if (state.plan != null) {
      await prefs.setString('tg_plan_v1', jsonEncode(state.plan!.toJson()));
    } else {
      await prefs.remove('tg_plan_v1');
    }
  }

  Future<void> generate(PlannerConfig config) async {
    state = PlannerState(config: config, status: PlannerStatus.loading);

    try {
      final start = DateTime.parse(config.startDate);
      final end = DateTime.parse(config.endDate);
      final dates = <String>[];
      for (var d = start; !d.isAfter(end); d = d.add(const Duration(days: 1))) {
        dates.add(DateFormat('yyyy-MM-dd').format(d));
      }

      final days = await _service.generate(
        zone: config.zone,
        dates: dates,
        startHour: config.startHour,
        endHour: config.endHour,
        pois: laPois,
      );

      final plan = TripPlan(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        zone: config.zone,
        days: days,
        createdAt: DateTime.now().toIso8601String(),
        startHour: config.startHour,
        endHour: config.endHour,
      );

      state = PlannerState(plan: plan, config: config, status: PlannerStatus.ready);
      await _persist();
    } catch (e) {
      state = PlannerState(config: config, status: PlannerStatus.error, error: e.toString());
    }
  }

  void markDone(String poiId, bool done) {
    if (state.plan == null) return;
    for (final day in state.plan!.days) {
      for (final slot in day.slots) {
        if (slot.poiId == poiId) {
          slot.done = done;
        }
      }
    }
    state = state.copyWith(plan: state.plan);
    _persist();
  }

  Future<void> replan() async {
    if (state.plan == null) return;
    state = state.copyWith(isRescheduling: true);

    try {
      final completed = <String>[];
      final remaining = <DayPlan>[];
      for (final day in state.plan!.days) {
        for (final slot in day.slots) {
          if (slot.done) completed.add(slot.poiId);
        }
        final undoneSlots = day.slots.where((s) => !s.done).toList();
        if (undoneSlots.isNotEmpty) {
          remaining.add(DayPlan(date: day.date, label: day.label, slots: undoneSlots));
        }
      }

      final now = DateTime.now();
      final days = await _service.replan(
        completed: completed,
        remaining: remaining,
        currentTime: DateFormat('HH:mm').format(now),
        currentDate: DateFormat('yyyy-MM-dd').format(now),
      );

      // Merge completed days back
      final doneDays = state.plan!.days
          .where((d) => d.slots.every((s) => s.done))
          .toList();

      final plan = TripPlan(
        id: state.plan!.id,
        zone: state.plan!.zone,
        days: [...doneDays, ...days],
        createdAt: state.plan!.createdAt,
        startHour: state.plan!.startHour,
        endHour: state.plan!.endHour,
      );

      state = PlannerState(plan: plan, status: PlannerStatus.ready);
      await _persist();
    } catch (e) {
      state = state.copyWith(isRescheduling: false, error: e.toString());
    }
  }

  bool get isBehindSchedule {
    if (state.plan == null) return false;
    final now = DateTime.now();
    final today = DateFormat('yyyy-MM-dd').format(now);
    final currentTime = DateFormat('HH:mm').format(now);

    for (final day in state.plan!.days) {
      if (day.date == today) {
        for (final slot in day.slots) {
          if (!slot.done && slot.endTime.compareTo(currentTime) < 0) {
            return true;
          }
        }
      }
    }
    return false;
  }

  void clearPlan() {
    state = PlannerState();
    _persist();
  }
}

final plannerProvider = StateNotifierProvider<PlannerNotifier, PlannerState>((ref) {
  return PlannerNotifier(ref);
});
