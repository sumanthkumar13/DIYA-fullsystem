import 'package:dio/dio.dart';
import '../config/dio_client.dart';
import '../services/auth_service.dart';
import '../models/orders/order_checkout.dart';

class OrderService {
  final Dio _dio = DioClient.dio;
  final AuthService _auth = AuthService();

  Future<OrderCheckoutResponse> checkout(OrderCheckoutRequest req) async {
    try {
      print("📤 [ORDER SERVICE] Sending checkout request to /api/retailer/orders/checkout");
      print("📤 [ORDER SERVICE] Payload: ${req.toJson()}");

      // Auth header is automatically added by DioClient interceptor
      final token = await _auth.getToken();
      print("📤 [ORDER SERVICE] Token exists: ${token != null && token.isNotEmpty}");

      final res = await _dio.post(
        "/api/retailer/orders/checkout",
        data: req.toJson(),
      );

      print("✅ [ORDER SERVICE] Response status: ${res.statusCode}");
      print("✅ [ORDER SERVICE] Response data: ${res.data}");

      // Handle both direct response and wrapped response
      Map<String, dynamic> responseData;
      if (res.data is Map) {
        responseData = res.data as Map<String, dynamic>;
        // Check if response is wrapped in a "data" field
        if (responseData.containsKey('data') && responseData['data'] is Map) {
          responseData = responseData['data'] as Map<String, dynamic>;
          print("📦 [ORDER SERVICE] Unwrapped response from 'data' field");
        }
      } else {
        throw Exception("Invalid response format: ${res.data}");
      }

      return OrderCheckoutResponse.fromJson(responseData);
    } on DioException catch (e) {
      print("❌ [ORDER SERVICE] DioException: ${e.message}");
      print("❌ [ORDER SERVICE] Status code: ${e.response?.statusCode}");
      print("❌ [ORDER SERVICE] Response data: ${e.response?.data}");
      rethrow;
    } catch (e) {
      print("❌ [ORDER SERVICE] Unexpected error: $e");
      rethrow;
    }
  }

  Future<List<Map<String, dynamic>>> getRetailerOrders() async {
    final res = await _dio.get(
      "/api/retailer/orders",
    );

    final data = res.data;
    if (data is List) {
      return data.map((e) => (e as Map).cast<String, dynamic>()).toList();
    }
    return [];
  }

  Future<Map<String, dynamic>> getRetailerOrderDetail(String orderId) async {
    final res = await _dio.get(
      "/api/retailer/orders/$orderId",
    );

    final data = res.data;
    if (data is Map) {
      return data.cast<String, dynamic>();
    }
    return {};
  }
}
