import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:travel_guide/config/theme.dart';
import 'package:travel_guide/providers/auth_provider.dart';
import 'package:travel_guide/providers/filter_provider.dart';
import 'package:travel_guide/providers/map_provider.dart';
import 'package:travel_guide/widgets/common/glass_container.dart';
import 'package:travel_guide/widgets/common/gps_button.dart';

class FloatingHeader extends ConsumerWidget {
  const FloatingHeader({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sidebarOpen = ref.watch(sidebarOpenProvider);
    final plannerOpen = ref.watch(plannerOpenProvider);
    final filters = ref.watch(filterProvider);
    final auth = ref.watch(authProvider);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      child: GlassContainer(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        borderRadius: BorderRadius.circular(16),
        child: Row(
          children: [
            // Hamburger / sidebar toggle
            GestureDetector(
              onTap: () => ref.read(sidebarOpenProvider.notifier).state = !sidebarOpen,
              child: Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: sidebarOpen ? AppColors.ocean500.withValues(alpha: 0.2) : Colors.transparent,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  sidebarOpen ? Icons.close : Icons.menu,
                  color: sidebarOpen ? AppColors.ocean400 : Colors.white70,
                  size: 20,
                ),
              ),
            ),
            const SizedBox(width: 8),

            // Title
            const Expanded(
              child: Text(
                'PCH Trip Guide',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: AppColors.ocean400,
                ),
              ),
            ),

            // Active filter count
            if (filters.hasActiveFilters)
              Container(
                margin: const EdgeInsets.only(right: 8),
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: AppColors.ocean500.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  '${filters.activeFilterCount}',
                  style: const TextStyle(fontSize: 11, color: AppColors.ocean400),
                ),
              ),

            // GPS button
            const GpsButton(),
            const SizedBox(width: 8),

            // Planner toggle
            GestureDetector(
              onTap: () => ref.read(plannerOpenProvider.notifier).state = !plannerOpen,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: plannerOpen ? AppColors.ocean500.withValues(alpha: 0.3) : Colors.white.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: plannerOpen ? AppColors.ocean500 : Colors.white24,
                  ),
                ),
                child: Text(
                  'Planner',
                  style: TextStyle(
                    fontSize: 12,
                    color: plannerOpen ? AppColors.ocean400 : Colors.white54,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),

            // Auth button
            GestureDetector(
              onTap: () {
                if (auth.isAuthenticated) {
                  ref.read(authProvider.notifier).logout();
                } else {
                  context.go('/login');
                }
              },
              child: Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  auth.isAuthenticated ? Icons.person : Icons.person_outline,
                  size: 18,
                  color: auth.isAuthenticated ? AppColors.ocean400 : Colors.white54,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
