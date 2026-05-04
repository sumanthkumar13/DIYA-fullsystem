import 'dart:io';

import 'package:dio/dio.dart';
import 'package:mime/mime.dart';

class CloudinaryUploadService {
  static const String cloudName = 'dld05xsji';
  static const String uploadPreset = 'diya_settings';

  static String get _endpoint => 'https://api.cloudinary.com/v1_1/$cloudName/image/upload';

  /// Unsigned upload (no secrets). Returns secure_url.
  Future<String> uploadImage({
    required File file,
    void Function(int percent)? onProgress,
  }) async {
    final mime = lookupMimeType(file.path) ?? '';
    if (!(mime == 'image/jpeg' || mime == 'image/png' || mime == 'image/webp')) {
      throw Exception('Only JPG, PNG, or WEBP images are allowed.');
    }

    final length = await file.length();
    const maxBytes = 5 * 1024 * 1024;
    if (length > maxBytes) {
      throw Exception('Image must be 5MB or smaller.');
    }

    final dio = Dio();

    final form = FormData.fromMap({
      'file': await MultipartFile.fromFile(
        file.path,
      ),
      'upload_preset': uploadPreset,
    });

    final res = await dio.post(
      _endpoint,
      data: form,
      options: Options(
        // Cloudinary expects multipart form.
        contentType: 'multipart/form-data',
      ),
      onSendProgress: (sent, total) {
        if (total <= 0) return;
        final p = ((sent / total) * 100).round().clamp(0, 100);
        onProgress?.call(p);
      },
    );

    final data = res.data;
    if (data is Map && data['secure_url'] is String && (data['secure_url'] as String).trim().isNotEmpty) {
      return (data['secure_url'] as String).trim();
    }

    throw Exception('Upload failed. Please try again.');
  }
}

