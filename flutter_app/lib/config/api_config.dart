import 'package:flutter/foundation.dart';

class ApiConfig {
  static String get baseUrl {
    if (kIsWeb) {
      // In web, use relative URLs (proxied by dev server) or configure
      return const String.fromEnvironment('API_URL', defaultValue: 'http://localhost:8000');
    }
    // For mobile/desktop, point to the API server
    return const String.fromEnvironment('API_URL', defaultValue: 'http://localhost:8000');
  }
}
