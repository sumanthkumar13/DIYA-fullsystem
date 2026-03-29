import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/auth_service.dart';
import 'retailer_session_provider.dart';

enum AuthStatus { unauthenticated, authenticated, loading }

class AuthNotifier extends StateNotifier<AuthStatus> {
  final AuthService _authService = AuthService();
  final Ref _ref;

  AuthNotifier(this._ref) : super(AuthStatus.loading) {
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    final token = await _authService.getToken();
    final authed = token != null && token.isNotEmpty;
    if (authed) {
      // Hydrate app state on cold start (both self-signup and wholesaler-created users)
      await _ref.read(retailerSessionProvider.notifier).sync();
    }
    state = authed ? AuthStatus.authenticated : AuthStatus.unauthenticated;
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
        await _ref.read(retailerSessionProvider.notifier).sync();
        state = AuthStatus.authenticated; // ✅ IMPORTANT FIX
      } else {
        state = AuthStatus.unauthenticated;
      }

      return true;
    } catch (e) {
      state = AuthStatus.unauthenticated;
      return false;
    }
  }

  Future<bool> loginWithPassword(String phone, String password) async {
    try {
      state = AuthStatus.loading;
      await _authService.loginWithPassword(phone, password);
      await _ref.read(retailerSessionProvider.notifier).sync();
      state = AuthStatus.authenticated;
      return true;
    } catch (e) {
      state = AuthStatus.unauthenticated;
      return false;
    }
  }

  Future<Map<String, dynamic>> loginPhone(String phone) async {
    try {
      // phone-first flow does not change auth state yet
      final res = await _authService.loginPhone(phone);
      return res;
    } catch (e) {
      rethrow;
    }
  }

  Future<void> logout() async {
    await _authService.logout();
    _ref.read(retailerSessionProvider.notifier).clear();
    state = AuthStatus.unauthenticated;
  }
}

final authProvider =
    StateNotifierProvider<AuthNotifier, AuthStatus>((ref) => AuthNotifier(ref));
