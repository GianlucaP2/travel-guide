import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:travel_guide/config/theme.dart';
import 'package:travel_guide/providers/auth_provider.dart';

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _navigate();
  }

  Future<void> _navigate() async {
    // Wait for auth to finish loading
    await Future.delayed(const Duration(milliseconds: 500));
    if (!mounted) return;

    // Go directly to map -- auth is optional (guest mode)
    context.go('/');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.dark500,
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('\u{1F30A}', style: TextStyle(fontSize: 64)),
            const SizedBox(height: 16),
            Text(
              'PCH Trip Guide',
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    color: AppColors.ocean400,
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 8),
            Text(
              'San Francisco \u2192 Los Angeles',
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    color: Colors.white54,
                  ),
            ),
            const SizedBox(height: 32),
            const CircularProgressIndicator(color: AppColors.ocean500),
          ],
        ),
      ),
    );
  }
}
