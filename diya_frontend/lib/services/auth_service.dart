import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../config/dio_client.dart';

class AuthService {
  final Dio _dio = DioClient.dio;
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  static const _tokenKey = 'jwt_token';

  Future<Map<String, dynamic>> login(String identifier, String password) async {
    final response = await _dio.post(
      '/api/auth/login',
      data: {'identifier': identifier, 'password': password},
    );

    final res = response.data as Map<String, dynamic>;

    if (res['success'] != true) {
      throw Exception(res['message'] ?? 'Login failed');
    }

    final data = (res['data'] as Map<String, dynamic>?);
    if (data == null) throw Exception("Login failed: missing data");

    final token = data['token'];
    if (token == null || token is! String || token.isEmpty) {
      throw Exception("Login failed: token missing");
    }

    // ✅ Save token for interceptor
    await _storage.write(key: _tokenKey, value: token);

    return data;
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
