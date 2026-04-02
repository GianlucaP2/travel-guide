import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:travel_guide/config/constants.dart';
import 'package:travel_guide/config/theme.dart';
import 'package:travel_guide/models/proximity_alert.dart';
import 'package:travel_guide/providers/proximity_provider.dart';
import 'package:travel_guide/providers/map_provider.dart';
import 'package:travel_guide/widgets/common/glass_container.dart';

class NotificationToastStack extends ConsumerWidget {
  const NotificationToastStack({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final alerts = ref.watch(proximityProvider).alerts;
    final visible = alerts.take(3).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.end,
      mainAxisSize: MainAxisSize.min,
      children: [
        for (final alert in visible)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: _ToastCard(alert: alert),
          ),
      ],
    );
  }
}

class _ToastCard extends ConsumerStatefulWidget {
  final ProximityAlert alert;
  const _ToastCard({required this.alert});

  @override
  ConsumerState<_ToastCard> createState() => _ToastCardState();
}

class _ToastCardState extends ConsumerState<_ToastCard> {
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    // Auto-dismiss tier 3/4 after 20s
    if (widget.alert.poi.tier >= 3) {
      _timer = Timer(const Duration(seconds: 20), () {
        if (mounted) {
          ref.read(proximityProvider.notifier).dismissAlert(widget.alert.id);
        }
      });
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final alert = widget.alert;
    final emoji = categoryEmoji[alert.poi.category] ?? '';
    final tierColor = AppColors.tierColor(alert.poi.tier);

    return SizedBox(
      width: 300,
      child: GlassContainer(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(height: 3, color: tierColor),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(emoji, style: const TextStyle(fontSize: 18)),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          alert.poi.name,
                          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: tierColor.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          '${alert.etaMinutes} min',
                          style: TextStyle(fontSize: 11, color: tierColor, fontWeight: FontWeight.w600),
                        ),
                      ),
                      const SizedBox(width: 4),
                      GestureDetector(
                        onTap: () => ref.read(proximityProvider.notifier).dismissAlert(alert.id),
                        child: const Icon(Icons.close, size: 16, color: Colors.white38),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(alert.poi.region, style: const TextStyle(fontSize: 12, color: Colors.white54)),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: GestureDetector(
                          onTap: () {
                            ref.read(selectedPoiProvider.notifier).state = alert.poi;
                            ref.read(proximityProvider.notifier).dismissAlert(alert.id);
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 6),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: const Text('View', textAlign: TextAlign.center, style: TextStyle(fontSize: 12)),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: GestureDetector(
                          onTap: () => launchUrl(Uri.parse(alert.navigationUrl), mode: LaunchMode.externalApplication),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 6),
                            decoration: BoxDecoration(
                              color: AppColors.ocean500.withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: const Text('Route', textAlign: TextAlign.center, style: TextStyle(fontSize: 12, color: AppColors.ocean400)),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
