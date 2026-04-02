import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';
import 'package:travel_guide/config/constants.dart';
import 'package:travel_guide/config/theme.dart';
import 'package:travel_guide/models/poi.dart';
import 'package:travel_guide/providers/filter_provider.dart';
import 'package:travel_guide/providers/gps_provider.dart';
import 'package:travel_guide/providers/map_provider.dart';
import 'package:travel_guide/services/route_service.dart';

final _routeProvider = FutureProvider<List<LatLng>>((ref) async {
  return RouteService().getRoute();
});

final _mapControllerProvider = Provider<MapController>((ref) => MapController());

class AppMapView extends ConsumerStatefulWidget {
  const AppMapView({super.key});

  @override
  ConsumerState<AppMapView> createState() => _AppMapViewState();
}

class _AppMapViewState extends ConsumerState<AppMapView> {
  bool _userDragging = false;

  @override
  Widget build(BuildContext context) {
    final filteredPois = ref.watch(filteredPoisProvider);
    final gps = ref.watch(gpsProvider);
    final selectedPoi = ref.watch(selectedPoiProvider);
    final route = ref.watch(_routeProvider);
    final mapController = ref.watch(_mapControllerProvider);

    // Auto-follow GPS
    if (gps.tracking && gps.following && gps.hasPosition && !_userDragging) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        try {
          mapController.move(LatLng(gps.lat!, gps.lng!), mapController.camera.zoom);
        } catch (_) {}
      });
    }

    return FlutterMap(
      mapController: mapController,
      options: MapOptions(
        initialCenter: const LatLng(37.0, -121.9),
        initialZoom: 7,
        onPointerDown: (_, __) => _userDragging = true,
        onPointerUp: (_, __) {
          _userDragging = false;
          if (gps.following) {
            ref.read(gpsProvider.notifier).setFollowing(false);
          }
        },
      ),
      children: [
        // CartoDB Dark Matter tiles
        TileLayer(
          urlTemplate: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
          subdomains: const ['a', 'b', 'c', 'd'],
          userAgentPackageName: 'com.travelguide.travel_guide',
        ),

        // Highway 1 polyline
        route.when(
          data: (coords) => PolylineLayer(
            polylines: [
              Polyline(
                points: coords,
                color: AppColors.ocean500.withValues(alpha: 0.6),
                strokeWidth: 3,
                isDotted: true,
              ),
            ],
          ),
          loading: () => const PolylineLayer(polylines: []),
          error: (_, __) => const PolylineLayer(polylines: []),
        ),

        // GPS accuracy circle
        if (gps.hasPosition && gps.accuracy != null)
          CircleLayer(
            circles: [
              CircleMarker(
                point: LatLng(gps.lat!, gps.lng!),
                radius: gps.accuracy!,
                useRadiusInMeter: true,
                color: AppColors.ocean500.withValues(alpha: 0.1),
                borderColor: AppColors.ocean500.withValues(alpha: 0.3),
                borderStrokeWidth: 1,
              ),
            ],
          ),

        // POI markers
        MarkerLayer(
          markers: filteredPois.map((poi) => _buildPoiMarker(poi, selectedPoi)).toList(),
        ),

        // GPS dot
        if (gps.hasPosition)
          MarkerLayer(
            markers: [
              Marker(
                point: LatLng(gps.lat!, gps.lng!),
                width: 20,
                height: 20,
                child: Container(
                  decoration: BoxDecoration(
                    color: AppColors.ocean500,
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 2),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.ocean500.withValues(alpha: 0.5),
                        blurRadius: 8,
                        spreadRadius: 2,
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
      ],
    );
  }

  Marker _buildPoiMarker(POI poi, POI? selected) {
    final isSelected = selected?.id == poi.id;
    final tierColor = AppColors.tierColor(poi.tier);
    final emoji = categoryEmoji[poi.category] ?? '';
    final size = switch (poi.tier) {
      1 => 38.0,
      2 => 28.0,
      3 => 22.0,
      _ => 16.0,
    };

    return Marker(
      point: LatLng(poi.lat, poi.lng),
      width: size + 4,
      height: size + 4,
      child: GestureDetector(
        onTap: () {
          ref.read(selectedPoiProvider.notifier).state = poi;
          ref.read(gpsProvider.notifier).setFollowing(false);
          try {
            ref.read(_mapControllerProvider).move(LatLng(poi.lat, poi.lng), 14);
          } catch (_) {}
        },
        child: Container(
          width: size + 4,
          height: size + 4,
          decoration: BoxDecoration(
            color: isSelected ? tierColor : tierColor.withValues(alpha: 0.85),
            shape: BoxShape.circle,
            border: Border.all(
              color: isSelected ? Colors.white : Colors.white.withValues(alpha: 0.5),
              width: isSelected ? 2.5 : 1.5,
            ),
            boxShadow: isSelected
                ? [BoxShadow(color: tierColor.withValues(alpha: 0.5), blurRadius: 8)]
                : null,
          ),
          child: Center(
            child: Text(
              emoji,
              style: TextStyle(fontSize: size * 0.45),
            ),
          ),
        ),
      ),
    );
  }
}
