import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/auth_service.dart';

enum AuthStatus { unauthenticated, authenticated, loading }

class AuthNotifier extends StateNotifier<AuthStatus> {
  final AuthService _authService = AuthService();
  AuthNotifier() : super(AuthStatus.loading) {
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    final token = await _authService.getToken();
    state = (token != null && token.isNotEmpty)
        ? AuthStatus.authenticated
        : AuthStatus.unauthenticated;
  }

  Future<bool> register(Map<String, dynamic> body) async {
    try {
      state = AuthStatus.loading;

      final ok = await _authService.registerRetailer(body);

      if (!ok) {
        state = AuthStatus.unauthenticated;
        return false;
      }

      // ✅ If register succeeded, token should be saved
      final token = await _authService.getToken();
      if (token != null && token.isNotEmpty) {
        state = AuthStatus.authenticated; // ✅ IMPORTANT FIX
      } else {
        state = AuthStatus.unauthenticated;
      }

      return true;
    } catch (e) {
      print("REGISTER ERROR: $e");
      state = AuthStatus.unauthenticated;
      return false;
    }
  }

  Future<bool> login(String identifier, String password) async {
    try {
      state = AuthStatus.loading;

      await _authService.login(identifier, password);

      state = AuthStatus.authenticated;
      return true;
    } catch (e) {
      state = AuthStatus.unauthenticated;
      return false;
    }
  }

  Future<void> logout() async {
    await _authService.logout();
    state = AuthStatus.unauthenticated;
  }
}

final authProvider =
    StateNotifierProvider<AuthNotifier, AuthStatus>((ref) => AuthNotifier());
