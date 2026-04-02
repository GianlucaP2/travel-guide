import 'package:flutter/material.dart';
import 'package:travel_guide/config/constants.dart';
import 'package:travel_guide/config/theme.dart';
import 'package:travel_guide/widgets/common/glass_container.dart';

class TierLegend extends StatelessWidget {
  const TierLegend({super.key});

  @override
  Widget build(BuildContext context) {
    return GlassContainer(
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          for (final tier in [1, 2, 3, 4])
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 2),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 10,
                    height: 10,
                    decoration: BoxDecoration(
                      color: AppColors.tierColor(tier),
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    tierBadge(tier),
                    style: const TextStyle(fontSize: 11, color: Colors.white70),
                  ),
                ],
              ),
            ),
          const SizedBox(height: 4),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(width: 16, height: 2, color: AppColors.ocean500),
              const SizedBox(width: 8),
              const Text('Highway 1', style: TextStyle(fontSize: 11, color: Colors.white70)),
            ],
          ),
        ],
      ),
    );
  }
}
