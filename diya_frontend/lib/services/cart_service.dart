import 'package:dio/dio.dart';
import '../config/dio_client.dart';
import '../services/auth_service.dart';
import '../models/cart/cart_dto.dart';

class CartService {
  final Dio _dio = DioClient.dio;
  final AuthService _auth = AuthService();

  Future<Map<String, String>> _authHeaders() async {
    final token = await _auth.getToken();
    if (token == null || token.isEmpty) return {};
    return {"Authorization": "Bearer $token"};
  }

  Future<CartDTO> getCart({required String wholesalerId}) async {
    final res = await _dio.get(
      "/api/retailer/cart",
      queryParameters: {"wholesalerId": wholesalerId},
      options: Options(headers: await _authHeaders()),
    );
    return CartDTO.fromJson(res.data as Map<String, dynamic>);
  }

  Future<CartDTO> addToCart({
    required String productId,
    required int quantity,
  }) async {
    final res = await _dio.post(
      "/api/retailer/cart/add",
      data: {"productId": productId, "quantity": quantity},
      options: Options(headers: await _authHeaders()),
    );
    return CartDTO.fromJson(res.data as Map<String, dynamic>);
  }

  Future<CartDTO> updateCart({
    required String productId,
    required int quantity,
  }) async {
    final res = await _dio.put(
      "/api/retailer/cart/update",
      data: {"productId": productId, "quantity": quantity},
      options: Options(headers: await _authHeaders()),
    );
    return CartDTO.fromJson(res.data as Map<String, dynamic>);
  }

  Future<CartDTO> removeFromCart({required String productId}) async {
    final res = await _dio.delete(
      "/api/retailer/cart/remove/$productId",
      options: Options(headers: await _authHeaders()),
    );
    return CartDTO.fromJson(res.data as Map<String, dynamic>);
  }
}
