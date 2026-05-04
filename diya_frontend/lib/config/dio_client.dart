import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'dart:io' show Platform;

class DioClient {
  static String _resolveBaseUrl() {
  const defined = String.fromEnvironment('API_BASE_URL');
  if (defined.isNotEmpty) return defined;

  if (kReleaseMode) return 'https://diyadigital.in';

  // For real device with adb reverse → use localhost
  return 'http://localhost:8081';
}

  static final Dio dio = Dio(
    BaseOptions(
      baseUrl: _resolveBaseUrl(),
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      headers: {'Content-Type': 'application/json'},
    ),
  )
    // ✅ Response + Error logger (VERY IMPORTANT)
    ..interceptors.add(InterceptorsWrapper(
      onResponse: (response, handler) {
        if (!kReleaseMode) {
          debugPrint("✅ [DIO RES] ${response.statusCode} ${response.requestOptions.path}");
          debugPrint("✅ [DIO RES DATA] ${response.data}");
        }
        handler.next(response);
      },
      onError: (e, handler) {
        if (!kReleaseMode) {
          debugPrint("❌ [DIO ERROR] ${e.response?.statusCode} ${e.requestOptions.path}");
          debugPrint("❌ [DIO ERROR DATA] ${e.response?.data}");
          debugPrint("❌ [DIO ERROR MSG] ${e.message}");
        }
        handler.next(e);
      },
    ))
    // ✅ Auth header injector
    ..interceptors.add(_AuthInterceptor());
}

class _AuthInterceptor extends Interceptor {
  final _storage = const FlutterSecureStorage();

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    final token = await _storage.read(key: 'jwt_token');

    if (!kReleaseMode) {
      debugPrint("➡️ [DIO] ${options.method} ${options.baseUrl}${options.path}");
      debugPrint("➡️ [DIO] Token exists: ${token != null && token.isNotEmpty}");
    }
    if (token != null && token.isNotEmpty) {
      if (!kReleaseMode) {
        final previewLen = token.length >= 20 ? 20 : token.length;
        debugPrint("➡️ [DIO] Token preview: ${token.substring(0, previewLen)}...");
      }
      options.headers['Authorization'] = 'Bearer $token';
    }

    handler.next(options);
  }
}
