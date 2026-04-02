import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:travel_guide/config/theme.dart';
import 'package:travel_guide/providers/gps_provider.dart';

class GpsButton extends ConsumerWidget {
  const GpsButton({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final gps = ref.watch(gpsProvider);

    if (gps.error != null) {
      return _buildButton(
        icon: Icons.warning_amber_rounded,
        label: 'GPS error',
        color: AppColors.tier1,
        onTap: () => ref.read(gpsProvider.notifier).startTracking(),
      );
    }

    if (!gps.tracking) {
      return _buildButton(
        icon: Icons.my_location,
        label: 'Track me',
        color: Colors.white54,
        onTap: () => ref.read(gpsProvider.notifier).startTracking(),
      );
    }

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        GestureDetector(
          onTap: () => ref.read(gpsProvider.notifier).setFollowing(!gps.following),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: gps.following ? AppColors.ocean500.withValues(alpha: 0.3) : Colors.white.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: gps.following ? AppColors.ocean500 : Colors.white24,
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  gps.following ? Icons.navigation : Icons.navigation_outlined,
                  size: 16,
                  color: gps.following ? AppColors.ocean400 : Colors.white54,
                ),
                const SizedBox(width: 4),
                Text(
                  gps.following ? 'Following' : 'Follow',
                  style: TextStyle(
                    fontSize: 12,
                    color: gps.following ? AppColors.ocean400 : Colors.white54,
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(width: 6),
        GestureDetector(
          onTap: () => ref.read(gpsProvider.notifier).stopTracking(),
          child: Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: Colors.green.withValues(alpha: 0.2),
              shape: BoxShape.circle,
              border: Border.all(color: Colors.green.withValues(alpha: 0.5)),
            ),
            child: const Icon(Icons.gps_fixed, size: 16, color: Colors.green),
          ),
        ),
      ],
    );
  }

  Widget _buildButton({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 16, color: color),
            const SizedBox(width: 4),
            Text(label, style: TextStyle(fontSize: 12, color: color)),
          ],
        ),
      ),
    );
  }
}
