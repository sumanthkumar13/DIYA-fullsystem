import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/auth_service.dart';
import 'approved_wholesalers_provider.dart';
import 'selected_wholesaler_provider.dart';
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
    final hasToken = token != null && token.isNotEmpty;
    if (!hasToken) {
      state = AuthStatus.unauthenticated;
      return;
    }

    try {
      final res = await _authService.me();
      final ok = res['success'] == true;
      if (!ok) {
        await logout();
        return;
      }

      final data = (res['data'] as Map?)?.cast<String, dynamic>();
      final retailerProfileExists = data?['retailerProfileExists'] == true;

      // Ensure connection-related providers are rebuilt for current identity.
      _ref.invalidate(approvedWholesalersProvider);
      _ref.read(selectedWholesalerIdProvider.notifier).state = null;

      // Hydrate app state only when retailer profile exists (avoids crashes for incomplete onboarding).
      if (retailerProfileExists) {
        await _ref.read(retailerSessionProvider.notifier).sync();
      }

      state = AuthStatus.authenticated;
    } catch (e) {
      // token invalid/expired/network issues → treat as unauthenticated on startup
      await logout();
    }
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
        _ref.invalidate(approvedWholesalersProvider);
        _ref.read(selectedWholesalerIdProvider.notifier).state = null;
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
      _ref.invalidate(approvedWholesalersProvider);
      _ref.read(selectedWholesalerIdProvider.notifier).state = null;
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
    _ref.invalidate(approvedWholesalersProvider);
    _ref.read(selectedWholesalerIdProvider.notifier).state = null;
    state = AuthStatus.unauthenticated;
  }
}

final authProvider =
    StateNotifierProvider<AuthNotifier, AuthStatus>((ref) => AuthNotifier(ref));
