import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:travel_guide/models/poi.dart';

final selectedPoiProvider = StateProvider<POI?>((ref) => null);
final sidebarOpenProvider = StateProvider<bool>((ref) => false);
final plannerOpenProvider = StateProvider<bool>((ref) => false);
