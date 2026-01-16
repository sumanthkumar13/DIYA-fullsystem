import 'package:dio/dio.dart';
import '../config/dio_client.dart';
import '../models/wholesaler_search_model.dart';

class WholesalerDiscoveryService {
  final Dio _dio = DioClient.dio;

  Future<List<WholesalerSearchModel>> searchWholesalers({
    String? q,
  }) async {
    final res = await _dio.get(
      '/api/retailer/wholesalers/search', // ✅ IMPORTANT FIX
      queryParameters: {
        if (q != null && q.trim().isNotEmpty) 'q': q.trim(),
      },
    );

    final list = (res.data as List).cast<Map<String, dynamic>>();
    return list.map(WholesalerSearchModel.fromJson).toList();
  }
}
