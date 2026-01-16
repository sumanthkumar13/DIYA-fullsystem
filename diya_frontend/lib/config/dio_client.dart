import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class DioClient {
  static final Dio dio = Dio(
    BaseOptions(
      // baseUrl: 'http://10.33.123.111:8081',
      baseUrl: 'http://localhost:8081',
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      headers: {'Content-Type': 'application/json'},
    ),
  )
    // ✅ Response + Error logger (VERY IMPORTANT)
    ..interceptors.add(InterceptorsWrapper(
      onResponse: (response, handler) {
        print("✅ [DIO RES] ${response.statusCode} ${response.requestOptions.path}");
        print("✅ [DIO RES DATA] ${response.data}");
        handler.next(response);
      },
      onError: (e, handler) {
        print("❌ [DIO ERROR] ${e.response?.statusCode} ${e.requestOptions.path}");
        print("❌ [DIO ERROR DATA] ${e.response?.data}");
        print("❌ [DIO ERROR MSG] ${e.message}");
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

    print("➡️ [DIO] ${options.method} ${options.baseUrl}${options.path}");
    print("➡️ [DIO] Token exists: ${token != null && token.isNotEmpty}");
    if (token != null && token.isNotEmpty) {
      print("➡️ [DIO] Token preview: ${token.substring(0, 20)}...");
      options.headers['Authorization'] = 'Bearer $token';
    }

    handler.next(options);
  }
}
