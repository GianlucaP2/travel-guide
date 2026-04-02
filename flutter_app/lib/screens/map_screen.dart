import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:travel_guide/config/theme.dart';
import 'package:travel_guide/providers/auth_provider.dart';
import 'package:travel_guide/providers/map_provider.dart';
import 'package:travel_guide/providers/filter_provider.dart';
import 'package:travel_guide/providers/gps_provider.dart';
import 'package:travel_guide/providers/proximity_provider.dart';
import 'package:travel_guide/widgets/map/map_view.dart';
import 'package:travel_guide/widgets/sidebar/sidebar.dart';
import 'package:travel_guide/widgets/poi_detail/poi_detail_panel.dart';
import 'package:travel_guide/widgets/planner/planner_panel.dart';
import 'package:travel_guide/widgets/common/gps_button.dart';
import 'package:travel_guide/widgets/common/notification_toast.dart';
import 'package:travel_guide/widgets/common/tier_legend.dart';
import 'package:travel_guide/widgets/common/floating_header.dart';
import 'package:go_router/go_router.dart';

class MapScreen extends ConsumerWidget {
  const MapScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selectedPoi = ref.watch(selectedPoiProvider);
    final sidebarOpen = ref.watch(sidebarOpenProvider);
    final plannerOpen = ref.watch(plannerOpenProvider);
    final isDesktop = MediaQuery.of(context).size.width >= 768;
    // Watch proximity to keep provider alive
    ref.watch(proximityProvider);

    return Scaffold(
      backgroundColor: AppColors.dark500,
      body: Stack(
        children: [
          // Map fills entire screen
          const Positioned.fill(child: AppMapView()),

          // Floating header
          const Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: SafeArea(child: FloatingHeader()),
          ),

          // Desktop: Sidebar as fixed left panel
          if (isDesktop && sidebarOpen)
            const Positioned(
              top: 70,
              left: 0,
              bottom: 0,
              width: 360,
              child: AppSidebar(),
            ),

          // Desktop: POI Detail as right panel
          if (isDesktop && selectedPoi != null)
            Positioned(
              top: 70,
              right: plannerOpen ? 400 : 0,
              bottom: 0,
              width: 380,
              child: const POIDetailPanel(),
            ),

          // Desktop: Planner panel on far right
          if (isDesktop && plannerOpen)
            const Positioned(
              top: 70,
              right: 0,
              bottom: 0,
              width: 400,
              child: PlannerPanel(),
            ),

          // Mobile: Bottom sheet sidebar
          if (!isDesktop && sidebarOpen)
            Positioned.fill(
              child: GestureDetector(
                onTap: () => ref.read(sidebarOpenProvider.notifier).state = false,
                child: Container(color: Colors.black54),
              ),
            ),
          if (!isDesktop && sidebarOpen)
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              height: MediaQuery.of(context).size.height * 0.65,
              child: const ClipRRect(
                borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                child: AppSidebar(),
              ),
            ),

          // Mobile: POI detail bottom sheet
          if (!isDesktop && selectedPoi != null)
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              height: MediaQuery.of(context).size.height * 0.55,
              child: const ClipRRect(
                borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                child: POIDetailPanel(),
              ),
            ),

          // Mobile: Planner full screen
          if (!isDesktop && plannerOpen)
            const Positioned.fill(child: PlannerPanel()),

          // Tier legend (bottom-left)
          if (isDesktop)
            const Positioned(
              left: 16,
              bottom: 16,
              child: TierLegend(),
            ),

          // Notification toasts (top-right)
          const Positioned(
            top: 80,
            right: 16,
            child: NotificationToastStack(),
          ),
        ],
      ),
    );
  }
}
