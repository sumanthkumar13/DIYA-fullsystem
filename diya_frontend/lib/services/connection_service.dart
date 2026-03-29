import 'package:dio/dio.dart';
import '../config/dio_client.dart';
import '../services/auth_service.dart';
import '../models/connections/connection_response_dto.dart';

class ConnectionService {
  final Dio _dio = DioClient.dio;
  final AuthService _auth = AuthService();

  Future<Map<String, String>> _authHeaders() async {
    final token = await _auth.getToken();
    if (token == null || token.isEmpty) return {};
    return {"Authorization": "Bearer $token"};
  }

  /// ✅ Existing: Approved wholesalers list (keep)
  Future<List<ConnectionResponseDTO>> getApprovedWholesalers() async {
    final res = await _dio.get(
      "/api/retailer/connections/approved",
      options: Options(headers: await _authHeaders()),
    );

    return (res.data as List<dynamic>)
        .map((e) => ConnectionResponseDTO.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// ✅ NEW: Get all connections (APPROVED/PENDING)
  Future<List<ConnectionResponseDTO>> myConnections() async {
    final res = await _dio.get(
      "/api/retailer/connections",
      options: Options(headers: await _authHeaders()),
    );

    return (res.data as List<dynamic>)
        .map((e) => ConnectionResponseDTO.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// ✅ NEW: Request connection with wholesaler
  Future<void> requestConnection(String wholesalerId) async {
    await _dio.post(
      "/api/retailer/connections/request",
      data: {"wholesalerId": wholesalerId},
      options: Options(headers: await _authHeaders()),
    );
  }

  // ==========================================================
  // WHOLESALER: pending connection requests
  // ==========================================================
  Future<List<ConnectionResponseDTO>> pendingRequestsForWholesaler() async {
    final res = await _dio.get(
      "/api/wholesaler/connections/requests",
      options: Options(headers: await _authHeaders()),
    );

    return (res.data as List<dynamic>)
        .map((e) => ConnectionResponseDTO.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  // ==========================================================
  // WHOLESALER: update connection status
  // ==========================================================
  Future<ConnectionResponseDTO> updateConnectionStatus({
    required String connectionId,
    required String status,
  }) async {
    final res = await _dio.put(
      "/api/wholesaler/connections/$connectionId",
      data: {"status": status},
      options: Options(headers: await _authHeaders()),
    );

    return ConnectionResponseDTO.fromJson(res.data as Map<String, dynamic>);
  }
}
