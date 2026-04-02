import 'dart:ui';
import 'package:flutter/material.dart';

class AppColors {
  static const ocean50 = Color(0xFFF0F9FF);
  static const ocean100 = Color(0xFFE0F2FE);
  static const ocean200 = Color(0xFFBAE6FD);
  static const ocean300 = Color(0xFF7DD3FC);
  static const ocean400 = Color(0xFF38BDF8);
  static const ocean500 = Color(0xFF0EA5E9);
  static const ocean600 = Color(0xFF0284C7);
  static const ocean700 = Color(0xFF0369A1);

  static const dark100 = Color(0xFF1E2A3A);
  static const dark200 = Color(0xFF162130);
  static const dark300 = Color(0xFF0F1825);
  static const dark400 = Color(0xFF0A1019);
  static const dark500 = Color(0xFF060C14);

  static const tier1 = Color(0xFFEF4444);
  static const tier2 = Color(0xFFF97316);
  static const tier3 = Color(0xFF0EA5E9);
  static const tier4 = Color(0xFF6B7280);

  static Color tierColor(int tier) {
    switch (tier) {
      case 1:
        return tier1;
      case 2:
        return tier2;
      case 3:
        return tier3;
      case 4:
        return tier4;
      default:
        return tier4;
    }
  }
}

class AppTheme {
  static ThemeData get dark {
    return ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: AppColors.dark500,
      primaryColor: AppColors.ocean500,
      colorScheme: const ColorScheme.dark(
        primary: AppColors.ocean500,
        secondary: AppColors.ocean400,
        surface: AppColors.dark300,
        error: AppColors.tier1,
      ),
      fontFamily: 'Inter',
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.dark300,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.1)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.1)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.ocean500),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.ocean500,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      ),
    );
  }
}
