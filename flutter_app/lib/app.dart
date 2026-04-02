import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:travel_guide/config/theme.dart';
import 'package:travel_guide/providers/auth_provider.dart';
import 'package:travel_guide/screens/auth/login_screen.dart';
import 'package:travel_guide/screens/auth/register_screen.dart';
import 'package:travel_guide/screens/map_screen.dart';
import 'package:travel_guide/screens/splash_screen.dart';

final _router = GoRouter(
  initialLocation: '/splash',
  routes: [
    GoRoute(path: '/splash', builder: (_, __) => const SplashScreen()),
    GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
    GoRoute(path: '/register', builder: (_, __) => const RegisterScreen()),
    GoRoute(path: '/', builder: (_, __) => const MapScreen()),
  ],
);

class TravelGuideApp extends ConsumerWidget {
  const TravelGuideApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp.router(
      title: 'PCH Trip Guide \u00b7 SF \u2192 LA',
      theme: AppTheme.dark,
      routerConfig: _router,
      debugShowCheckedModeBanner: false,
    );
  }
}
