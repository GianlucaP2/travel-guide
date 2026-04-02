import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:travel_guide/models/user.dart';
import 'package:travel_guide/services/api_service.dart';
import 'package:travel_guide/services/auth_service.dart';
import 'package:travel_guide/services/google_auth_service.dart';

final apiServiceProvider = Provider<ApiService>((ref) => ApiService());

final authServiceProvider = Provider<AuthService>((ref) {
  return AuthService(ref.read(apiServiceProvider));
});

final googleAuthServiceProvider = Provider<GoogleAuthService>((ref) => GoogleAuthService());

class AuthState {
  final User? user;
  final bool loading;
  final String? error;

  const AuthState({this.user, this.loading = false, this.error});

  AuthState copyWith({User? user, bool? loading, String? error}) {
    return AuthState(
      user: user ?? this.user,
      loading: loading ?? this.loading,
      error: error,
    );
  }

  bool get isAuthenticated => user != null;
}

class AuthNotifier extends StateNotifier<AuthState> {
  final AuthService _authService;
  final GoogleAuthService _googleAuth;

  AuthNotifier(this._authService, this._googleAuth) : super(const AuthState(loading: true)) {
    _tryAutoLogin();
  }

  Future<void> _tryAutoLogin() async {
    try {
      final hasToken = await _authService.hasStoredToken();
      if (hasToken) {
        final user = await _authService.getMe();
        state = AuthState(user: user);
      } else {
        state = const AuthState();
      }
    } catch (_) {
      state = const AuthState();
    }
  }

  Future<void> register(String email, String password, String displayName) async {
    state = state.copyWith(loading: true, error: null);
    try {
      final user = await _authService.register(email, password, displayName);
      state = AuthState(user: user);
    } catch (e) {
      state = state.copyWith(loading: false, error: _parseError(e));
    }
  }

  Future<void> login(String email, String password) async {
    state = state.copyWith(loading: true, error: null);
    try {
      final user = await _authService.login(email, password);
      state = AuthState(user: user);
    } catch (e) {
      state = state.copyWith(loading: false, error: _parseError(e));
    }
  }

  Future<void> googleSignIn() async {
    state = state.copyWith(loading: true, error: null);
    try {
      final idToken = await _googleAuth.signIn();
      if (idToken == null) {
        state = state.copyWith(loading: false);
        return;
      }
      final user = await _authService.googleAuth(idToken);
      state = AuthState(user: user);
    } catch (e) {
      state = state.copyWith(loading: false, error: _parseError(e));
    }
  }

  Future<void> logout() async {
    await _authService.logout();
    await _googleAuth.signOut();
    state = const AuthState();
  }

  void skipAuth() {
    state = const AuthState();
  }

  String _parseError(dynamic e) {
    if (e is Exception) return e.toString().replaceFirst('Exception: ', '');
    return 'An error occurred';
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(
    ref.read(authServiceProvider),
    ref.read(googleAuthServiceProvider),
  );
});
