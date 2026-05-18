import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/auth_service.dart';
import 'approved_wholesalers_provider.dart';
import 'selected_wholesaler_provider.dart';
import 'retailer_session_provider.dart';

enum AuthStatus { unauthenticated, authenticated, loading }

class AuthNotifier extends StateNotifier<AuthStatus> {
  final AuthService _authService = AuthService();
  final Ref _ref;

  /// Single startup auth check — awaited by splash (no duplicate /api/auth/me).
  late final Future<void> _ready = _checkAuth();

  /// Set during [_checkAuth] from /api/auth/me response.
  bool retailerProfileExists = false;

  AuthNotifier(this._ref) : super(AuthStatus.loading);

  /// Await once before routing past splash.
  Future<void> waitUntilReady() => _ready;

  Future<void> _checkAuth() async {
    final token = await _authService.getToken();
    final hasToken = token != null && token.isNotEmpty;
    if (!hasToken) {
      retailerProfileExists = false;
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
      retailerProfileExists = data?['retailerProfileExists'] == true;

      _ref.read(selectedWholesalerIdProvider.notifier).state = null;

      if (retailerProfileExists) {
        final hydrated = await _ref.read(retailerSessionProvider.notifier).sync();
        if (!hydrated) {
          throw StateError('Retailer session failed to hydrate');
        }
      }

      state = AuthStatus.authenticated;
    } catch (e) {
      if (!kReleaseMode) {
        debugPrint('❌ [AUTH] startup failed: $e');
      }
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

      final token = await _authService.getToken();
      if (token != null && token.isNotEmpty) {
        _ref.invalidate(approvedWholesalersProvider);
        _ref.read(selectedWholesalerIdProvider.notifier).state = null;
        retailerProfileExists = true;
        final hydrated = await _ref.read(retailerSessionProvider.notifier).sync();
        if (!hydrated) {
          state = AuthStatus.unauthenticated;
          return false;
        }
        state = AuthStatus.authenticated;
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

      final res = await _authService.me();
      final data = (res['data'] as Map?)?.cast<String, dynamic>();
      retailerProfileExists = data?['retailerProfileExists'] == true;

      if (retailerProfileExists) {
        final hydrated = await _ref.read(retailerSessionProvider.notifier).sync();
        if (!hydrated) {
          state = AuthStatus.unauthenticated;
          return false;
        }
      }

      state = AuthStatus.authenticated;
      return true;
    } catch (e) {
      state = AuthStatus.unauthenticated;
      return false;
    }
  }

  Future<Map<String, dynamic>> loginPhone(String phone) async {
    try {
      final res = await _authService.loginPhone(phone);
      return res;
    } catch (e) {
      rethrow;
    }
  }

  /// Reuses POST /api/retailer/request-otp (works for claimed retailers).
  Future<Map<String, dynamic>> requestPasswordResetOtp(String phone) async {
    return _authService.requestRetailerOtp(phone);
  }

  /// Reuses POST /api/retailer/verify-otp to set a new password.
  Future<Map<String, dynamic>> resetPasswordWithOtp(
    String phone,
    String otp,
    String password,
  ) async {
    return _authService.verifyRetailerOtp(phone, otp, password);
  }

  Future<void> logout() async {
    await _authService.logout();
    retailerProfileExists = false;
    _ref.read(retailerSessionProvider.notifier).clear();
    _ref.invalidate(approvedWholesalersProvider);
    _ref.read(selectedWholesalerIdProvider.notifier).state = null;
    state = AuthStatus.unauthenticated;
  }
}

final authProvider =
    StateNotifierProvider<AuthNotifier, AuthStatus>((ref) => AuthNotifier(ref));
