import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../config/dio_client.dart';

class AuthService {
  final Dio _dio = DioClient.dio;
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  static const _tokenKey = 'jwt_token';

  /// Step 1: phone-first login – determine flow
  Future<Map<String, dynamic>> loginPhone(String phone) async {
    final response = await _dio.post(
      '/api/retailer/login-phone',
      data: {'phone': phone},
    );

    final res = response.data as Map<String, dynamic>;
    print("loginPhone response: $res");
    return res;
  }

  /// Request OTP for retailer claim (returns OTP in dev)
  Future<Map<String, dynamic>> requestRetailerOtp(String phone) async {
    final response = await _dio.post(
      '/api/retailer/request-otp',
      data: {'phone': phone},
    );
    final res = response.data as Map<String, dynamic>;
    print("requestRetailerOtp response: $res");
    return res;
  }

  /// Verify OTP and set password in a single backend call
  Future<Map<String, dynamic>> verifyRetailerOtp(
      String phone, String otp, String password) async {
    final response = await _dio.post(
      '/api/retailer/verify-otp',
      data: {'phone': phone, 'otp': otp, 'password': password},
    );
    final res = response.data as Map<String, dynamic>;
    print("verifyRetailerOtp response: $res");
    return res;
  }

  /// Set retailer password and receive JWT token
  Future<Map<String, dynamic>> setRetailerPassword(
      String phone, String password) async {
    final response = await _dio.post(
      '/api/retailer/set-password',
      data: {'phone': phone, 'password': password},
    );

    final res = response.data as Map<String, dynamic>;
    print("setRetailerPassword response: $res");

    final token = res['token'];
    if (token == null || token is! String || token.isEmpty) {
      throw Exception("Set password failed: token missing");
    }

    await _storage.write(key: _tokenKey, value: token);
    return res;
  }

  /// Step 2 (if PASSWORD_LOGIN_REQUIRED): login with phone + password
  Future<Map<String, dynamic>> loginWithPassword(String phone, String password) async {
    final response = await _dio.post(
      '/api/retailer/login',
      data: {'phone': phone, 'password': password},
    );

    final res = response.data as Map<String, dynamic>;
    print("loginWithPassword response: $res");

    final token = res['token'];
    if (token == null || token is! String || token.isEmpty) {
      throw Exception("Login failed: token missing");
    }

    // ✅ Save token for interceptor
    await _storage.write(key: _tokenKey, value: token);

    return res;
  }

  /// ✅ Updated: Save JWT token after successful registration
  Future<bool> registerRetailer(Map<String, dynamic> payload) async {
    try {
      print("REGISTER -> payload: $payload");

      final res = await _dio.post(
        '/api/auth/register-retailer',
        data: payload,
      );

      print("REGISTER -> status: ${res.statusCode}");
      print("REGISTER -> data: ${res.data}");

      final body = res.data as Map<String, dynamic>;

      if (body['success'] != true) {
        print("REGISTER -> failed: ${body['message']}");
        return false;
      }

      final data = body['data'] as Map<String, dynamic>?;
      if (data == null) {
        throw Exception("Registration success but response data missing");
      }

      final token = data['token'];
      if (token == null || token is! String || token.isEmpty) {
        throw Exception("Registration success but token missing");
      }

      // ✅ Save token for Dio interceptor
      await _storage.write(key: _tokenKey, value: token);

      return true;
    } on DioException catch (e) {
      print("REGISTER FAILED (DioException)");
      print("STATUS: ${e.response?.statusCode}");
      print("DATA: ${e.response?.data}");
      print("MESSAGE: ${e.message}");
      return false;
    } catch (e) {
      print("REGISTER FAILED (Unknown): $e");
      return false;
    }
  }

  Future<void> logout() async {
    await _storage.delete(key: _tokenKey);
    await _storage.delete(key: 'user_role');
  }

  Future<String?> getToken() async => _storage.read(key: _tokenKey);
}
