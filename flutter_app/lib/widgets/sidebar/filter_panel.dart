import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:travel_guide/config/constants.dart';
import 'package:travel_guide/config/theme.dart';
import 'package:travel_guide/providers/filter_provider.dart';
import 'package:travel_guide/providers/poi_provider.dart';

class FilterPanel extends ConsumerWidget {
  const FilterPanel({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final filters = ref.watch(filterProvider);
    final pois = ref.watch(poiProvider).pois;

    // Count POIs per category/tier/region
    final categoryCounts = <String, int>{};
    final tierCounts = <int, int>{};
    final regionCounts = <String, int>{};
    for (final poi in pois) {
      categoryCounts[poi.category] = (categoryCounts[poi.category] ?? 0) + 1;
      tierCounts[poi.tier] = (tierCounts[poi.tier] ?? 0) + 1;
      regionCounts[poi.region] = (regionCounts[poi.region] ?? 0) + 1;
    }

    return ListView(
      padding: const EdgeInsets.all(12),
      children: [
        // Tier section
        const Text('Importance', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white54)),
        const SizedBox(height: 8),
        Row(
          children: [
            for (final tier in [1, 2, 3, 4]) ...[
              Expanded(
                child: _tierButton(ref, tier, filters.tiers.contains(tier), tierCounts[tier] ?? 0),
              ),
              if (tier < 4) const SizedBox(width: 6),
            ],
          ],
        ),

        const SizedBox(height: 20),
        const Text('Category', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white54)),
        const SizedBox(height: 8),
        Wrap(
          spacing: 6,
          runSpacing: 6,
          children: allCategories.map((cat) {
            final active = filters.categories.contains(cat);
            return GestureDetector(
              onTap: () => ref.read(filterProvider.notifier).toggleCategory(cat),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: active ? AppColors.ocean500.withValues(alpha: 0.2) : AppColors.dark300,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: active ? AppColors.ocean500 : Colors.white12),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(categoryEmoji[cat] ?? '', style: const TextStyle(fontSize: 14)),
                    const SizedBox(width: 4),
                    Text(
                      '${categoryLabel[cat]} (${categoryCounts[cat] ?? 0})',
                      style: TextStyle(
                        fontSize: 11,
                        color: active ? AppColors.ocean400 : Colors.white54,
                      ),
                    ),
                  ],
                ),
              ),
            );
          }).toList(),
        ),

        const SizedBox(height: 20),
        const Text('Region', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white54)),
        const SizedBox(height: 8),
        for (final region in allRegions)
          if ((regionCounts[region] ?? 0) > 0)
            GestureDetector(
              onTap: () => ref.read(filterProvider.notifier).toggleRegion(region),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                margin: const EdgeInsets.only(bottom: 4),
                decoration: BoxDecoration(
                  color: filters.regions.contains(region)
                      ? AppColors.ocean500.withValues(alpha: 0.15)
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Row(
                  children: [
                    Icon(
                      filters.regions.contains(region) ? Icons.check_circle : Icons.circle_outlined,
                      size: 14,
                      color: filters.regions.contains(region) ? AppColors.ocean400 : Colors.white24,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        region,
                        style: TextStyle(
                          fontSize: 12,
                          color: filters.regions.contains(region) ? AppColors.ocean400 : Colors.white54,
                        ),
                      ),
                    ),
                    Text(
                      '${regionCounts[region]}',
                      style: const TextStyle(fontSize: 11, color: Colors.white24),
                    ),
                  ],
                ),
              ),
            ),

        if (filters.hasActiveFilters) ...[
          const SizedBox(height: 16),
          TextButton(
            onPressed: () => ref.read(filterProvider.notifier).clearFilters(),
            style: TextButton.styleFrom(foregroundColor: AppColors.tier1),
            child: const Text('Clear All Filters'),
          ),
        ],
      ],
    );
  }

  Widget _tierButton(WidgetRef ref, int tier, bool active, int count) {
    final color = AppColors.tierColor(tier);
    return GestureDetector(
      onTap: () => ref.read(filterProvider.notifier).toggleTier(tier),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(
          color: active ? color.withValues(alpha: 0.2) : AppColors.dark300,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: active ? color : Colors.white12),
        ),
        child: Column(
          children: [
            Text('$tier', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: active ? color : Colors.white54)),
            Text('($count)', style: const TextStyle(fontSize: 10, color: Colors.white38)),
          ],
        ),
      ),
    );
  }
}
