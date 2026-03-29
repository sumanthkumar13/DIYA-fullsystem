import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../services/connection_service.dart';
import '../services/order_service.dart';
import '../services/payment_service.dart';
import '../services/retailer_dashboard_service.dart';

final connectionServiceProvider =
    Provider<ConnectionService>((ref) => ConnectionService());

class RetailerSessionData {
  final Map<String, dynamic> profile;
  final List<Map<String, dynamic>> orders;
  final List<Map<String, dynamic>> ledgerEntries;
  final List<dynamic> approvedWholesalers; // uses DTO elsewhere; keep flexible here

  const RetailerSessionData({
    required this.profile,
    required this.orders,
    required this.ledgerEntries,
    required this.approvedWholesalers,
  });

  num get totalDue {
    // ledger endpoint is list of entries; dashboard needs a single number.
    // If backend ledger entries include DEBIT/CREDIT, compute (DEBIT - CREDIT).
    num sum = 0;
    for (final e in ledgerEntries) {
      final type = (e['entryType'] ?? e['type'] ?? '').toString().toUpperCase();
      final amount = (e['amount'] is num)
          ? (e['amount'] as num)
          : num.tryParse((e['amount'] ?? '0').toString()) ?? 0;
      if (type == 'CREDIT') {
        sum -= amount;
      } else {
        // default to DEBIT
        sum += amount;
      }
    }
    return sum;
  }

  Map<String, dynamic>? get lastOrder {
    if (orders.isEmpty) return null;
    final sorted = [...orders];
    sorted.sort((a, b) {
      final ad = DateTime.tryParse((a['date'] ?? '').toString()) ??
          DateTime.tryParse((a['placedAt'] ?? '').toString()) ??
          DateTime.fromMillisecondsSinceEpoch(0);
      final bd = DateTime.tryParse((b['date'] ?? '').toString()) ??
          DateTime.tryParse((b['placedAt'] ?? '').toString()) ??
          DateTime.fromMillisecondsSinceEpoch(0);
      return bd.compareTo(ad);
    });
    return sorted.first;
  }

  List<Map<String, dynamic>> get recentOrders {
    if (orders.isEmpty) return const [];
    final sorted = [...orders];
    sorted.sort((a, b) {
      final ad = DateTime.tryParse((a['date'] ?? '').toString()) ??
          DateTime.tryParse((a['placedAt'] ?? '').toString()) ??
          DateTime.fromMillisecondsSinceEpoch(0);
      final bd = DateTime.tryParse((b['date'] ?? '').toString()) ??
          DateTime.tryParse((b['placedAt'] ?? '').toString()) ??
          DateTime.fromMillisecondsSinceEpoch(0);
      return bd.compareTo(ad);
    });
    return sorted.take(5).toList();
  }
}

class RetailerSessionNotifier extends StateNotifier<AsyncValue<RetailerSessionData?>> {
  final RetailerDashboardService _dashboardService;
  final OrderService _orderService;
  final PaymentService _paymentService;
  final ConnectionService _connectionService;

  RetailerSessionNotifier(
    this._dashboardService,
    this._orderService,
    this._paymentService,
    this._connectionService,
  ) : super(const AsyncValue.data(null));

  Future<void> sync() async {
    state = const AsyncValue.loading();
    try {
      // 1) Get Retailer Profile (from dashboard endpoint)
      final dash = await _dashboardService.getDashboard();
      final profile = (dash['retailerProfile'] is Map)
          ? (dash['retailerProfile'] as Map).cast<String, dynamic>()
          : <String, dynamic>{};

      // 2) Get Retailer Orders
      final orders = await _orderService.getRetailerOrders();

      // 3) Get Retailer Ledger / Due Balance (entries)
      final ledger = await _paymentService.getRetailerLedgerEntries();

      // 4) Get Wholesaler Info (relationships)
      final wholesalers = await _connectionService.getApprovedWholesalers();

      state = AsyncValue.data(
        RetailerSessionData(
          profile: profile,
          orders: orders,
          ledgerEntries: ledger,
          approvedWholesalers: wholesalers,
        ),
      );
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  void clear() {
    state = const AsyncValue.data(null);
  }
}

final retailerDashboardServiceProvider =
    Provider<RetailerDashboardService>((ref) => RetailerDashboardService());

final retailerSessionProvider =
    StateNotifierProvider<RetailerSessionNotifier, AsyncValue<RetailerSessionData?>>((ref) {
  return RetailerSessionNotifier(
    ref.read(retailerDashboardServiceProvider),
    ref.read(orderServiceProvider),
    ref.read(paymentServiceProvider),
    ref.read(connectionServiceProvider),
  );
});

final orderServiceProvider = Provider<OrderService>((ref) => OrderService());
final paymentServiceProvider = Provider<PaymentService>((ref) => PaymentService());

