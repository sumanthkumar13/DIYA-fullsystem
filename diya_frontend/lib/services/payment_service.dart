import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../config/dio_client.dart';
import '../utils/debug_log.dart';
import '../utils/safe_json.dart';

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
    if (data is Map) {
      final map = mapFromJsonObject(data);
      final parsed = parsePaymentItem(map, tag: 'retailer/payments/record');
      return parsed ?? map;
    }
    return {};
  }

  Future<List<Map<String, dynamic>>> getRetailerPayments() async {
    final res = await _dio.get("/api/retailer/payments");
    try {
      final raw = res.data;
      final rawList = extractApiList(raw);
      // #region agent log
      agentDebugLog(
        location: 'payment_service.dart:getRetailerPayments',
        message: 'raw payments API response',
        hypothesisId: 'H-D',
        data: {
          'rawType': raw.runtimeType.toString(),
          'rawListCount': rawList.length,
        },
      );
      // #endregion
      final parsed = parsePaymentListResponse(raw, tag: 'retailer/payments');
      // #region agent log
      agentDebugLog(
        location: 'payment_service.dart:getRetailerPayments',
        message: 'parsed payments list',
        hypothesisId: 'H-A',
        data: {
          'parsedCount': parsed.length,
          'summaries': summarizePaymentsForDebug(parsed),
        },
      );
      // #endregion
      return parsed;
    } catch (e, st) {
      // Never propagate parse errors — return what we can.
      // #region agent log
      agentDebugLog(
        location: 'payment_service.dart:getRetailerPayments',
        message: 'getRetailerPayments parse threw',
        hypothesisId: 'H-A',
        data: {'error': e.toString()},
      );
      // #endregion
      if (!kReleaseMode) {
        debugPrint('❌ [PaymentService] getRetailerPayments failed: $e');
        debugPrint('$st');
      }
      return [];
    }
  }

  Future<List<Map<String, dynamic>>> getRetailerLedgerEntries() async {
    final res = await _dio.get("/api/ledger/retailer");
    try {
      return parseLedgerListResponse(res.data, tag: 'ledger/retailer');
    } catch (e, st) {
      if (!kReleaseMode) {
        debugPrint('❌ [PaymentService] getRetailerLedgerEntries failed: $e');
        debugPrint('$st');
      }
      return [];
    }
  }
}
