import 'package:dio/dio.dart';
import '../config/dio_client.dart';

class RetailerDashboardService {
  final Dio _dio = DioClient.dio;

  Future<Map<String, dynamic>> getDashboard() async {
    final res = await _dio.get("/api/retailer/dashboard");
    final data = res.data;
    if (data is Map) return data.cast<String, dynamic>();
    return {};
  }
}

