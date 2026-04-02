import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:travel_guide/models/user.dart';
import 'package:travel_guide/services/api_service.dart';

class AuthService {
  final ApiService _api;
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  AuthService(this._api);

  Future<User> register(String email, String password, String displayName) async {
    final response = await _api.dio.post('/api/auth/register', data: {
      'email': email,
      'password': password,
      'display_name': displayName,
    });
    await _storeTokens(response.data);
    return await getMe();
  }

  Future<User> login(String email, String password) async {
    final response = await _api.dio.post('/api/auth/login', data: {
      'email': email,
      'password': password,
    });
    await _storeTokens(response.data);
    return await getMe();
  }

  Future<User> googleAuth(String idToken) async {
    final response = await _api.dio.post('/api/auth/google', data: {
      'id_token': idToken,
    });
    await _storeTokens(response.data);
    return await getMe();
  }

  Future<User> getMe() async {
    final response = await _api.dio.get('/api/users/me');
    return User.fromJson(response.data);
  }

  Future<void> logout() async {
    try {
      final refreshToken = await _storage.read(key: 'refresh_token');
      if (refreshToken != null) {
        await _api.dio.post('/api/auth/logout', data: {'refresh_token': refreshToken});
      }
    } catch (_) {}
    await _storage.deleteAll();
  }

  Future<bool> hasStoredToken() async {
    final token = await _storage.read(key: 'access_token');
    return token != null;
  }

  Future<void> _storeTokens(Map<String, dynamic> data) async {
    await _storage.write(key: 'access_token', value: data['access_token']);
    await _storage.write(key: 'refresh_token', value: data['refresh_token']);
  }
}
