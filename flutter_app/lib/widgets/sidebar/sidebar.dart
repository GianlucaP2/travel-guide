import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:travel_guide/config/constants.dart';
import 'package:travel_guide/config/theme.dart';
import 'package:travel_guide/models/poi.dart';
import 'package:travel_guide/providers/filter_provider.dart';
import 'package:travel_guide/providers/map_provider.dart';
import 'package:travel_guide/widgets/common/glass_container.dart';
import 'package:travel_guide/widgets/sidebar/filter_panel.dart';

enum SidebarTab { list, filters }

class AppSidebar extends ConsumerStatefulWidget {
  const AppSidebar({super.key});

  @override
  ConsumerState<AppSidebar> createState() => _AppSidebarState();
}

class _AppSidebarState extends ConsumerState<AppSidebar> {
  SidebarTab _tab = SidebarTab.list;
  bool _planMode = false;
  final Set<String> _selectedIds = {};

  @override
  Widget build(BuildContext context) {
    final filteredPois = ref.watch(filteredPoisProvider);
    final filters = ref.watch(filterProvider);

    return Container(
      color: AppColors.dark400.withValues(alpha: 0.95),
      child: Column(
        children: [
          // Tab bar + search
          Container(
            padding: const EdgeInsets.all(12),
            child: Column(
              children: [
                // Tabs
                Row(
                  children: [
                    _tabButton('List', SidebarTab.list),
                    const SizedBox(width: 8),
                    _tabButton('Filters', SidebarTab.filters),
                    const Spacer(),
                    if (_tab == SidebarTab.list)
                      GestureDetector(
                        onTap: () => setState(() {
                          _planMode = !_planMode;
                          if (!_planMode) _selectedIds.clear();
                        }),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: _planMode ? AppColors.ocean500.withValues(alpha: 0.2) : Colors.transparent,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            _planMode ? 'Done' : 'Plan',
                            style: TextStyle(
                              fontSize: 12,
                              color: _planMode ? AppColors.ocean400 : Colors.white54,
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 8),
                // Search bar
                if (_tab == SidebarTab.list)
                  TextField(
                    onChanged: (v) => ref.read(filterProvider.notifier).setSearch(v),
                    decoration: InputDecoration(
                      hintText: 'Search places...',
                      hintStyle: const TextStyle(color: Colors.white38, fontSize: 13),
                      prefixIcon: const Icon(Icons.search, size: 18, color: Colors.white38),
                      filled: true,
                      fillColor: AppColors.dark300,
                      contentPadding: const EdgeInsets.symmetric(vertical: 8),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: BorderSide.none,
                      ),
                    ),
                    style: const TextStyle(fontSize: 13),
                  ),
              ],
            ),
          ),

          // Content
          Expanded(
            child: _tab == SidebarTab.filters
                ? const FilterPanel()
                : _buildPoiList(filteredPois),
          ),

          // Plan mode footer
          if (_planMode && _selectedIds.length >= 2)
            Container(
              padding: const EdgeInsets.all(12),
              child: ElevatedButton(
                onPressed: _openItinerary,
                style: ElevatedButton.styleFrom(minimumSize: const Size.fromHeight(44)),
                child: Text('Open Itinerary (${_selectedIds.length} stops)'),
              ),
            ),
        ],
      ),
    );
  }

  Widget _tabButton(String label, SidebarTab tab) {
    final active = _tab == tab;
    return GestureDetector(
      onTap: () => setState(() => _tab = tab),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: active ? AppColors.ocean500.withValues(alpha: 0.2) : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: active ? FontWeight.w600 : FontWeight.normal,
            color: active ? AppColors.ocean400 : Colors.white54,
          ),
        ),
      ),
    );
  }

  Widget _buildPoiList(List<POI> pois) {
    // Group by region
    final Map<String, List<POI>> grouped = {};
    for (final poi in pois) {
      grouped.putIfAbsent(poi.region, () => []).add(poi);
    }

    final regions = allRegions.where((r) => grouped.containsKey(r)).toList();

    return ListView.builder(
      padding: const EdgeInsets.only(bottom: 16),
      itemCount: regions.length,
      itemBuilder: (context, i) {
        final region = regions[i];
        final regionPois = grouped[region]!;
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 12, 12, 4),
              child: Text(
                region,
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: Colors.white38,
                  letterSpacing: 0.5,
                ),
              ),
            ),
            for (final poi in regionPois) _buildPoiCard(poi),
          ],
        );
      },
    );
  }

  Widget _buildPoiCard(POI poi) {
    final tierColor = AppColors.tierColor(poi.tier);
    final emoji = categoryEmoji[poi.category] ?? '';
    final isSelected = _selectedIds.contains(poi.id);

    return GestureDetector(
      onTap: () {
        if (_planMode) {
          setState(() {
            isSelected ? _selectedIds.remove(poi.id) : _selectedIds.add(poi.id);
          });
        } else {
          ref.read(selectedPoiProvider.notifier).state = poi;
        }
      },
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? tierColor.withValues(alpha: 0.1) : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
          border: Border(left: BorderSide(color: tierColor, width: 3)),
        ),
        child: Row(
          children: [
            if (_planMode)
              Padding(
                padding: const EdgeInsets.only(right: 8),
                child: Icon(
                  isSelected ? Icons.check_box : Icons.check_box_outline_blank,
                  size: 18,
                  color: isSelected ? AppColors.ocean400 : Colors.white38,
                ),
              ),
            Text(emoji, style: const TextStyle(fontSize: 16)),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          poi.name,
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (poi.tier == 1) const Text(' \u{1F525}', style: TextStyle(fontSize: 12)),
                    ],
                  ),
                  if (poi.price != null)
                    Text(poi.price!, style: const TextStyle(fontSize: 11, color: Colors.white38)),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
              decoration: BoxDecoration(
                color: tierColor.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(3),
              ),
              child: Text(
                tierBadge(poi.tier),
                style: TextStyle(fontSize: 9, color: tierColor),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _openItinerary() {
    final pois = ref.read(filteredPoisProvider)
        .where((p) => _selectedIds.contains(p.id))
        .toList()
      ..sort((a, b) => (a.distanceFromSF ?? 0).compareTo(b.distanceFromSF ?? 0));

    if (pois.length < 2) return;

    final origin = '${pois.first.lat},${pois.first.lng}';
    final destination = '${pois.last.lat},${pois.last.lng}';
    final waypoints = pois.length > 2
        ? pois.sublist(1, pois.length - 1).map((p) => '${p.lat},${p.lng}').join('|')
        : '';

    final url = 'https://www.google.com/maps/dir/?api=1&origin=$origin&destination=$destination'
        '${waypoints.isNotEmpty ? '&waypoints=$waypoints' : ''}&travelmode=driving';

    launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
  }
}
