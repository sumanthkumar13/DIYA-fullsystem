import 'package:dio/dio.dart';
import '../config/dio_client.dart';
import '../services/auth_service.dart';
import '../models/orders/order_checkout.dart';

class OrderService {
  final Dio _dio = DioClient.dio;
  final AuthService _auth = AuthService();

  Future<Map<String, String>> _authHeaders() async {
    final token = await _auth.getToken();
    if (token == null || token.isEmpty) return {};
    return {"Authorization": "Bearer $token"};
  }

  Future<OrderCheckoutResponse> checkout(OrderCheckoutRequest req) async {
    final res = await _dio.post(
      "/api/retailer/orders/checkout",
      data: req.toJson(),
      options: Options(headers: await _authHeaders()),
    );

    return OrderCheckoutResponse.fromJson(res.data as Map<String, dynamic>);
  }
}
