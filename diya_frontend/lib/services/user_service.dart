import 'package:dio/dio.dart';

import '../config/dio_client.dart';

class UserService {
  final Dio _dio = DioClient.dio;

  Future<String?> updateAvatarUrl(String? avatarUrl) async {
    final url = (avatarUrl ?? '').trim();
    final res = await _dio.put(
      '/api/users/me/avatar',
      data: {'avatarUrl': url.isEmpty ? null : url},
    );
    final data = res.data;
    if (data is Map && data['avatarUrl'] != null) {
      return data['avatarUrl']?.toString();
    }
    return url.isEmpty ? null : url;
  }
}

