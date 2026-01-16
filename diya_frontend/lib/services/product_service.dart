import 'package:dio/dio.dart';
import '../config/dio_client.dart';
import '../services/auth_service.dart';
import '../models/common/page_response.dart';
import '../models/products/product_dto.dart';

class ProductService {
  final Dio _dio = DioClient.dio;
  final AuthService _auth = AuthService();

  Future<Map<String, String>> _authHeaders() async {
    final token = await _auth.getToken();
    if (token == null || token.isEmpty) return {};
    return {"Authorization": "Bearer $token"};
  }

  // ✅ wholesalerId is mandatory now
  Future<PageResponse<ProductResponseDTO>> getProducts({
    required String wholesalerId,
    String? search,
    String? categoryId,
    String? subcategoryId,
    int page = 0,
    int size = 20,
  }) async {
    final res = await _dio.get(
      "/api/retailer/products",
      queryParameters: {
        "wholesalerId": wholesalerId,
        if (search != null && search.trim().isNotEmpty) "search": search.trim(),
        if (categoryId != null) "categoryId": categoryId,
        if (subcategoryId != null) "subcategoryId": subcategoryId,
        "page": page,
        "size": size,
      },
      options: Options(headers: await _authHeaders()),
    );

    return PageResponse.fromJson(
      res.data as Map<String, dynamic>,
      (m) => ProductResponseDTO.fromJson(m),
    );
  }

  // ✅ wholesalerId is mandatory now
  Future<ProductDetailDTO> getProductDetail({
    required String wholesalerId,
    required String productId,
  }) async {
    final res = await _dio.get(
      "/api/retailer/products/$productId",
      queryParameters: {
        "wholesalerId": wholesalerId,
      },
      options: Options(headers: await _authHeaders()),
    );

    return ProductDetailDTO.fromJson(res.data as Map<String, dynamic>);
  }
}
