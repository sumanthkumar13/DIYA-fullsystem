import 'package:dio/dio.dart';
import '../config/dio_client.dart';

class PaymentService {
  final Dio _dio = DioClient.dio;

  Future<Map<String, dynamic>> recordRetailerPayment({
    required String orderId,
    required num amount,
    required String mode,
    String? reference,
    String? note,
  }) async {
    final res = await _dio.post(
      "/api/retailer/payments",
      data: {
        "orderId": orderId,
        "amount": amount,
        "mode": mode,
        "reference": reference,
        "note": note,
      },
    );

    final data = res.data;
    if (data is Map) return data.cast<String, dynamic>();
    return {};
  }

  Future<List<Map<String, dynamic>>> getRetailerPayments() async {
    final res = await _dio.get("/api/retailer/payments");
    final data = res.data;
    if (data is List) {
      return data.map((e) => (e as Map).cast<String, dynamic>()).toList();
    }
    return [];
  }

  Future<List<Map<String, dynamic>>> getRetailerLedgerEntries() async {
    final res = await _dio.get("/api/ledger/retailer");
    final data = res.data;
    if (data is List) {
      return data.map((e) => (e as Map).cast<String, dynamic>()).toList();
    }
    return [];
  }
}

