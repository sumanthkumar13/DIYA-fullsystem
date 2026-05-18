import 'package:flutter/foundation.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';



import '../services/connection_service.dart';

import '../services/order_service.dart';

import '../services/payment_service.dart';

import '../services/retailer_dashboard_service.dart';
import '../utils/safe_json.dart';



final connectionServiceProvider =

    Provider<ConnectionService>((ref) => ConnectionService());



class RetailerSessionData {

  final Map<String, dynamic> profile;

  final List<Map<String, dynamic>> orders;

  final List<Map<String, dynamic>> ledgerEntries;

  final List<Map<String, dynamic>> payments;

  final List<dynamic> approvedWholesalers;



  const RetailerSessionData({

    required this.profile,

    required this.orders,

    required this.ledgerEntries,

    required this.payments,

    required this.approvedWholesalers,

  });



  String get shopName => (profile['shopName'] ?? '').toString().trim();



  num get totalDue {

    final confirmedByOrderId = <String, num>{};

    for (final p in payments) {

      final status = (p['status'] ?? '').toString().toUpperCase();

      if (status != 'CONFIRMED') continue;

      final oid = orderIdFromPayment(p);

      if (oid.isEmpty) continue;

      final amt = (p['amount'] is num)

          ? (p['amount'] as num)

          : num.tryParse((p['amount'] ?? '0').toString()) ?? 0;

      confirmedByOrderId[oid] = (confirmedByOrderId[oid] ?? 0) + amt;

    }



    num sum = 0;

    for (final o in orders) {

      final oid = (o['id'] ?? '').toString();

      if (oid.isEmpty) continue;

      final status = (o['status'] ?? '').toString().toUpperCase();

      if (status == 'PLACED' || status == 'REJECTED' || status == 'CANCELLED') {

        continue;

      }



      final total = (o['amount'] is num)

          ? (o['amount'] as num)

          : (o['totalAmount'] is num)

              ? (o['totalAmount'] as num)

              : num.tryParse((o['amount'] ?? o['totalAmount'] ?? '0').toString()) ?? 0;



      final confirmed = confirmedByOrderId[oid] ?? 0;

      final remaining = total - confirmed;

      if (remaining > 0) sum += remaining;

    }



    return sum < 0 ? 0 : sum;

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



  int _syncGeneration = 0;

  Future<void>? _syncInFlight;



  RetailerSessionNotifier(

    this._dashboardService,

    this._orderService,

    this._paymentService,

    this._connectionService,

  ) : super(const AsyncValue.loading());



  bool get isHydrated => state.valueOrNull != null;



  /// Coalesces concurrent refresh calls into one in-flight request.

  /// Returns false when the initial hydrate could not load required data.

  Future<bool> sync() async {

    await (_syncInFlight ??= _syncInternal().whenComplete(() {

      _syncInFlight = null;

    }));

    return isHydrated;

  }



  Future<void> _syncInternal() async {

    final generation = ++_syncGeneration;

    final hadSession = state.valueOrNull != null;



    state = hadSession

        ? AsyncValue<RetailerSessionData?>.loading().copyWithPrevious(state)

        : const AsyncValue.loading();



    try {

      // Required for dashboard identity + orders list.

      final dash = await _dashboardService.getDashboard();

      final profile = (dash['retailerProfile'] is Map)

          ? (dash['retailerProfile'] as Map).cast<String, dynamic>()

          : <String, dynamic>{};



      if (profile.isEmpty || profile['shopName'] == null) {

        throw StateError('Dashboard response missing retailerProfile');

      }



      final orders = await _orderService.getRetailerOrders();



      // Best-effort: dues/history should not block the whole dashboard.

      List<Map<String, dynamic>> ledger = const [];

      List<Map<String, dynamic>> payments = const [];

      List<dynamic> wholesalers = const [];



      try {

        ledger = await _paymentService.getRetailerLedgerEntries();

      } catch (e, st) {

        if (!kReleaseMode) {

          debugPrint('⚠️ [SESSION] ledger fetch failed: $e');

          debugPrint('$st');

        }

      }



      try {

        payments = await _paymentService.getRetailerPayments();

      } catch (e, st) {

        if (!kReleaseMode) {

          debugPrint('⚠️ [SESSION] payments fetch failed: $e');

          debugPrint('$st');

        }

      }



      try {

        wholesalers = await _connectionService.getApprovedWholesalers();

      } catch (e, st) {

        if (!kReleaseMode) {

          debugPrint('⚠️ [SESSION] wholesalers fetch failed: $e');

          debugPrint('$st');

        }

      }



      if (generation != _syncGeneration) return;



      state = AsyncValue.data(

        RetailerSessionData(

          profile: profile,

          orders: orders,

          ledgerEntries: ledger,

          payments: payments,

          approvedWholesalers: wholesalers,

        ),

      );

    } catch (e, st) {

      if (generation != _syncGeneration) return;



      if (!kReleaseMode) {

        debugPrint('❌ [SESSION] sync failed: $e');

        debugPrint('$st');

      }



      state = AsyncValue<RetailerSessionData?>.error(e, st).copyWithPrevious(state);



      if (!hadSession) {

        rethrow;

      }

    }

  }



  void clear() {

    state = const AsyncValue.loading();

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



/// True once retailer profile/orders have been loaded at least once.

final retailerSessionHydratedProvider = Provider<bool>((ref) {

  return ref.watch(retailerSessionProvider).valueOrNull != null;

});


