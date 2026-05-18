import 'package:flutter/material.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../widgets/ui/diya_card.dart';

import '../../widgets/ui/diya_input.dart';

import '../../widgets/ui/diya_button.dart';

import '../../services/order_service.dart';

import '../../services/payment_service.dart';

import '../../providers/retailer_session_provider.dart';

import '../../utils/debug_log.dart';

import '../../utils/safe_json.dart';

import '../orders/order_detail_screen.dart';



const _historyPageSize = 20;



class PaymentsScreen extends ConsumerStatefulWidget {

  const PaymentsScreen({super.key});



  @override

  ConsumerState<PaymentsScreen> createState() => _PaymentsScreenState();

}



class _PaymentsScreenState extends ConsumerState<PaymentsScreen> {

  _PaymentsData? _data;

  bool _loading = true;

  String? _error;

  int _visibleHistoryCount = _historyPageSize;

  int _loadGeneration = 0;



  @override

  void initState() {

    super.initState();

    _load();

  }



  Future<void> _refresh() => _load();



  Future<void> _load({List<Map<String, dynamic>>? mergeWith}) async {

    final generation = ++_loadGeneration;

    if (_data == null) {

      setState(() {

        _loading = true;

        _error = null;

      });

    }



    try {

      final data = await _fetchPaymentsData();

      if (!mounted || generation != _loadGeneration) return;



      final mergedPayments = mergeWith != null

          ? mergePaymentsById(mergeWith, data.payments)

          : data.payments;



      // #region agent log

      agentDebugLog(

        location: 'payments_screen.dart:_load',

        message: mergeWith != null ? 'state merge after fetch' : 'state replace after fetch',

        hypothesisId: 'H-E',

        runId: 'post-fix',

        data: {

          'fetchedCount': data.payments.length,

          'mergeWithCount': mergeWith?.length ?? 0,

          'finalCount': mergedPayments.length,

          'summaries': summarizePaymentsForDebug(mergedPayments),

          'outstanding': data.outstanding,

        },

      );

      // #endregion



      setState(() {

        _data = _PaymentsData(

          outstanding: data.outstanding,

          dueOrders: data.dueOrders,

          payments: mergedPayments,

        );

        _loading = false;

        _error = null;

        if (mergeWith == null) {

          _visibleHistoryCount = _historyPageSize;

        }

      });

    } catch (e) {

      if (!mounted || generation != _loadGeneration) return;

      setState(() {

        _loading = false;

        _error = e.toString();

      });

    }

  }



  Future<_PaymentsData> _fetchPaymentsData() async {

    final paymentSvc = PaymentService();

    final orderSvc = OrderService();



    final results = await Future.wait([

      paymentSvc.getRetailerLedgerEntries(),

      orderSvc.getRetailerOrders(),

      paymentSvc.getRetailerPayments(),

    ]);



    final orders = results[1] as List<Map<String, dynamic>>;

    final payments = List<Map<String, dynamic>>.from(results[2] as List<Map<String, dynamic>>);



    final confirmedByOrderId = <String, double>{};

    for (final p in payments) {

      final status = (p['status'] ?? '').toString().toUpperCase();

      if (status != 'CONFIRMED') continue;

      final oid = orderIdFromPayment(p);

      if (oid.isEmpty) continue;

      final amt = (p['amount'] as num? ?? 0).toDouble();

      confirmedByOrderId[oid] = (confirmedByOrderId[oid] ?? 0) + amt;

    }



    final dueOrders = orders

        .map((o) {

          final orderId = (o['id'] ?? '').toString();

          final total = (o['amount'] as num? ?? o['totalAmount'] as num? ?? 0).toDouble();

          final confirmed = confirmedByOrderId[orderId] ?? 0;

          final remaining = total - confirmed;

          final status = (o['status'] ?? '').toString().toUpperCase();

          return _DueOrder(

            id: orderId,

            orderNumber: (o['orderNumber'] ?? o['orderNo'] ?? '').toString(),

            total: total,

            outstanding: remaining < 0 ? 0 : remaining,

            status: status,

          );

        })

        .where((o) =>

            o.outstanding > 0.01 &&

            o.status.isNotEmpty &&

            o.status != 'PLACED' &&

            o.status != 'REJECTED' &&

            o.status != 'CANCELLED')

        .toList()

      ..sort((a, b) => b.outstanding.compareTo(a.outstanding));



    final outstanding = dueOrders.fold<double>(0.0, (sum, o) => sum + o.outstanding);



    payments.sort((a, b) {

      final ad = DateTime.tryParse((a['createdAt'] ?? '').toString()) ??

          DateTime.fromMillisecondsSinceEpoch(0);

      final bd = DateTime.tryParse((b['createdAt'] ?? '').toString()) ??

          DateTime.fromMillisecondsSinceEpoch(0);

      return bd.compareTo(ad);

    });



    return _PaymentsData(

      outstanding: outstanding,

      dueOrders: dueOrders,

      payments: payments,

    );

  }



  Future<void> _showRecordPaymentSheet({required _DueOrder order}) async {

    final amountController = TextEditingController(text: order.outstanding.toStringAsFixed(0));

    final referenceController = TextEditingController();

    final noteController = TextEditingController();



    String mode = 'UPI';



    await showModalBottomSheet(

      context: context,

      isScrollControlled: true,

      backgroundColor: Colors.white,

      shape: const RoundedRectangleBorder(

        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),

      ),

      builder: (sheetContext) {
        return StatefulBuilder(
          builder: (sheetContext, setSheetState) {
            return Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 18,
            bottom: MediaQuery.of(sheetContext).viewInsets.bottom + 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(

                width: 46,

                height: 5,

                decoration: BoxDecoration(

                  color: const Color(0xFFE5E5E5),

                  borderRadius: BorderRadius.circular(99),

                ),

              ),

              const SizedBox(height: 18),

              const Text(

                'Record Payment',

                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900),

              ),

              const SizedBox(height: 18),

              DiyaInput(

                hintText: 'Enter Amount',

                controller: amountController,

                keyboardType: TextInputType.number,

                style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900),

              ),

              const SizedBox(height: 12),

              Container(

                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),

                decoration: BoxDecoration(

                  border: Border.all(color: const Color(0xFFE5E5E5)),

                  borderRadius: BorderRadius.circular(14),

                ),

                child: DropdownButtonHideUnderline(

                  child: DropdownButton<String>(

                    value: mode,

                    items: const [

                      DropdownMenuItem(value: 'UPI', child: Text('UPI')),

                      DropdownMenuItem(value: 'BANK_TRANSFER', child: Text('Bank Transfer')),

                      DropdownMenuItem(value: 'CASH', child: Text('Cash')),

                      DropdownMenuItem(value: 'CHEQUE', child: Text('Cheque')),

                    ],

                    onChanged: (v) {
                      if (v == null) return;
                      setSheetState(() => mode = v);
                    },

                  ),

                ),

              ),

              const SizedBox(height: 12),

              DiyaInput(

                hintText: 'Reference ID (optional)',

                controller: referenceController,

                keyboardType: TextInputType.text,

              ),

              const SizedBox(height: 12),

              DiyaInput(

                hintText: 'Note (optional)',

                controller: noteController,

                keyboardType: TextInputType.text,

              ),

              const SizedBox(height: 18),

              DiyaButton(

                fullWidth: true,

                text: 'Record Payment',

                onPressed: () async {

                  final amount = num.tryParse(amountController.text.trim());

                  if (amount == null || amount <= 0) {

                    ScaffoldMessenger.of(sheetContext).showSnackBar(

                      const SnackBar(content: Text('Enter a valid amount')),

                    );

                    return;

                  }



                  final beforePayments = _data?.payments ?? const [];

                  final outstandingBefore = _data?.outstanding ?? 0;



                  // #region agent log

                  agentDebugLog(

                    location: 'payments_screen.dart:recordPayment',

                    message: 'before record payment',

                    hypothesisId: 'H-E',

                    runId: 'post-fix',

                    data: {

                      'orderId': order.id,

                      'beforeCount': beforePayments.length,

                      'outstandingBefore': outstandingBefore,

                      'beforeSummaries': summarizePaymentsForDebug(beforePayments),

                    },

                  );

                  // #endregion



                  try {

                    final recorded = await PaymentService().recordRetailerPayment(

                      orderId: order.id,

                      amount: amount,

                      mode: mode,

                      reference: referenceController.text.trim().isEmpty

                          ? null

                          : referenceController.text.trim(),

                      note: noteController.text.trim().isEmpty ? null : noteController.text.trim(),

                    );



                    final merged = mergePaymentsById(

                      beforePayments,

                      recorded.isNotEmpty ? [recorded] : const [],

                    );



                    if (mounted) {

                      setState(() {

                        if (_data != null) {

                          _data = _PaymentsData(

                            outstanding: _data!.outstanding,

                            dueOrders: _data!.dueOrders,

                            payments: merged,

                          );

                        }

                      });

                    }



                    await ref.read(retailerSessionProvider.notifier).sync();

                    if (!mounted) return;

                    Navigator.pop(sheetContext);

                    ScaffoldMessenger.of(context).showSnackBar(

                      const SnackBar(

                        content: Text('Payment recorded (Pending verification)'),

                      ),

                    );



                    await _load(mergeWith: merged);



                    if (!mounted) return;

                    final afterPayments = _data?.payments ?? const [];

                    // #region agent log

                    agentDebugLog(

                      location: 'payments_screen.dart:recordPayment',

                      message: 'after record payment + refresh',

                      hypothesisId: 'H-E',

                      runId: 'post-fix',

                      data: {

                        'orderId': order.id,

                        'afterCount': afterPayments.length,

                        'outstandingAfter': _data?.outstanding ?? 0,

                        'afterSummaries': summarizePaymentsForDebug(afterPayments),

                        'lostIds': summarizePaymentsForDebug(beforePayments)

                            .map((p) => (p['id'] ?? '').toString())

                            .where(

                              (id) =>

                                  id.isNotEmpty &&

                                  !afterPayments.any((a) => (a['id'] ?? '').toString() == id),

                            )

                            .toList(),

                      },

                    );

                    // #endregion

                  } catch (_) {

                    if (!mounted) return;

                    ScaffoldMessenger.of(context).showSnackBar(

                      const SnackBar(content: Text('Failed to record payment')),

                    );

                  }

                },

              ),

            ],

          ),

        );
          },
        );
      },

    );

  }



  String _formatPaymentMode(String mode) {
    return mode.replaceAll('_', ' ').trim();
  }

  String? _rejectionReasonFromNote(String note) {
    final trimmed = note.trim();
    if (trimmed.isEmpty) return null;
    final lower = trimmed.toLowerCase();
    final idx = lower.indexOf('rejected:');
    if (idx >= 0) {
      final reason = trimmed.substring(idx + 'rejected:'.length).trim();
      if (reason.isNotEmpty) return reason;
    }
    return trimmed;
  }

  Widget _buildPaymentHistoryCard(Map<String, dynamic> p) {
    final amt = (p['amount'] as num? ?? 0).toDouble();
    final mode = _formatPaymentMode((p['mode'] ?? '-').toString());
    final ref = (p['reference'] ?? '').toString();
    final status = (p['status'] ?? '').toString();
    final note = (p['note'] ?? '').toString();
    final source = (p['source'] ?? '').toString().toUpperCase();
    final createdAt = DateTime.tryParse((p['createdAt'] ?? '').toString());
    final rejectedAt = DateTime.tryParse((p['rejectedAt'] ?? '').toString());



    String orderRef = '';

    final order = normalizeOrderRef(p['order']);

    if (order != null) {

      final orderNumber = (order['orderNumber'] ?? '').toString();

      final oid = (order['id'] ?? '').toString();

      orderRef = orderNumber.isNotEmpty

          ? 'Order #$orderNumber'

          : (oid.isNotEmpty ? 'Order #${oid.length > 8 ? oid.substring(0, 8) : oid}' : '');

    }



    Color badgeBg = const Color(0xFFF5F5F5);

    Color badgeFg = const Color(0xFF404040);

    String statusLabel = status;

    final su = status.toUpperCase();

    if (su.contains('PENDING')) {

      badgeBg = const Color(0xFFFEF3C7);

      badgeFg = const Color(0xFFB45309);

      statusLabel = 'Pending';

    } else if (su == 'CONFIRMED') {

      badgeBg = const Color(0xFFDCFCE7);

      badgeFg = const Color(0xFF16A34A);

      statusLabel = 'Confirmed';

    } else if (su == 'REJECTED') {

      badgeBg = const Color(0xFFFEE2E2);

      badgeFg = const Color(0xFFDC2626);

      statusLabel = 'Rejected';

    }



    final sourceLabel = source == 'IMMEDIATE' ? 'At acceptance' : null;
    final isRejected = su == 'REJECTED';
    final rejectionReason = isRejected ? _rejectionReasonFromNote(note) : null;

    if (isRejected) {
      final detailParts = <String>[
        '₹${amt.toStringAsFixed(0)}',
        mode,
        if (orderRef.isNotEmpty) orderRef,
        if (ref.isNotEmpty) 'Ref: $ref',
      ];

      return Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Container(
          decoration: BoxDecoration(
            color: const Color(0xFFFFF5F5),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFFECACA), width: 1.5),
            boxShadow: const [
              BoxShadow(
                color: Color(0x0A000000),
                blurRadius: 10,
                offset: Offset(0, 4),
              ),
            ],
          ),
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: const BoxDecoration(
                      color: Color(0xFFFEE2E2),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.cancel_outlined,
                      color: Color(0xFFDC2626),
                      size: 22,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Payment rejected by wholesaler',
                          style: TextStyle(
                            fontWeight: FontWeight.w900,
                            fontSize: 14,
                            color: Color(0xFFB91C1C),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          detailParts.join(' • '),
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF525252),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: badgeBg,
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      statusLabel,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        color: badgeFg,
                      ),
                    ),
                  ),
                ],
              ),
              if (rejectedAt != null || createdAt != null) ...[
                const SizedBox(height: 8),
                Text(
                  [
                    if (rejectedAt != null)
                      'Rejected on ${rejectedAt.day}/${rejectedAt.month}/${rejectedAt.year}',
                    if (createdAt != null && rejectedAt == null)
                      'Submitted on ${createdAt.day}/${createdAt.month}/${createdAt.year}',
                  ].join(' • '),
                  style: const TextStyle(fontSize: 12, color: Color(0xFF737373)),
                ),
              ],
              if (rejectionReason != null) ...[
                const SizedBox(height: 8),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.7),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFFECACA)),
                  ),
                  child: Text(
                    rejectionReason,
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF7F1D1D),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: DiyaCard(
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(color: badgeBg, shape: BoxShape.circle),
              child: Icon(Icons.payments_outlined, color: badgeFg, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    orderRef.isEmpty
                        ? '₹${amt.toStringAsFixed(0)} • $mode'
                        : '₹${amt.toStringAsFixed(0)} paid for $orderRef • $mode',
                    style: const TextStyle(fontWeight: FontWeight.w900),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    [
                      if (createdAt != null)
                        '${createdAt.day}/${createdAt.month}/${createdAt.year}',
                      if (ref.isNotEmpty) 'Ref: $ref',
                      if (sourceLabel != null) sourceLabel,
                    ].join(' • '),
                    style: const TextStyle(fontSize: 12, color: Color(0xFF737373)),
                  ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: badgeBg,
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(
                statusLabel,
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: badgeFg),
              ),
            ),
          ],
        ),
      ),
    );
  }



  @override

  Widget build(BuildContext context) {

    if (_loading && _data == null) {

      return RefreshIndicator(

        onRefresh: _refresh,

        color: const Color(0xFFFF7A00),

        child: ListView(

          physics: const AlwaysScrollableScrollPhysics(),

          children: List.generate(

            3,

            (i) => Padding(

              padding: const EdgeInsets.only(bottom: 12),

              child: Container(

                height: 90,

                decoration: BoxDecoration(

                  color: const Color(0xFFFFFFFF),

                  borderRadius: BorderRadius.circular(16),

                ),

              ),

            ),

          ),

        ),

      );

    }



    if (_error != null && _data == null) {

      return RefreshIndicator(

        onRefresh: _refresh,

        color: const Color(0xFFFF7A00),

        child: ListView(

          physics: const AlwaysScrollableScrollPhysics(),

          children: [

            Padding(

              padding: const EdgeInsets.symmetric(vertical: 24),

              child: Column(

                children: [

                  const Icon(Icons.error_outline, color: Color(0xFFDC2626), size: 32),

                  const SizedBox(height: 12),

                  Text(

                    'Could not load payments.\n$_error',

                    textAlign: TextAlign.center,

                    style: const TextStyle(color: Color(0xFF525252)),

                  ),

                  const SizedBox(height: 12),

                  DiyaButton(text: 'Retry', onPressed: _refresh),

                ],

              ),

            ),

          ],

        ),

      );

    }



    final data = _data ?? const _PaymentsData(outstanding: 0, dueOrders: [], payments: []);

    final visiblePayments = data.payments.take(_visibleHistoryCount).toList();

    final hasMoreHistory = data.payments.length > _visibleHistoryCount;



    return RefreshIndicator(

      onRefresh: _refresh,

      color: const Color(0xFFFF7A00),

      child: ListView(

        physics: const AlwaysScrollableScrollPhysics(),

        children: [

          Container(

            margin: const EdgeInsets.only(top: 8),

            padding: const EdgeInsets.all(22),

            decoration: BoxDecoration(

              gradient: const LinearGradient(

                begin: Alignment.topLeft,

                end: Alignment.bottomRight,

                colors: [Color(0xFF171717), Color(0xFF262626)],

              ),

              borderRadius: BorderRadius.circular(24),

              boxShadow: const [

                BoxShadow(

                  color: Color(0x33000000),

                  blurRadius: 24,

                  offset: Offset(0, 12),

                ),

              ],

            ),

            child: Column(

              crossAxisAlignment: CrossAxisAlignment.start,

              children: [

                const Text(

                  'Outstanding Balance',

                  style: TextStyle(

                    fontSize: 13,

                    fontWeight: FontWeight.w700,

                    color: Color(0xFFA3A3A3),

                  ),

                ),

                const SizedBox(height: 6),

                Text(

                  '₹${data.outstanding.toStringAsFixed(0)}',

                  style: const TextStyle(

                    fontSize: 38,

                    fontWeight: FontWeight.w900,

                    color: Colors.white,

                  ),

                ),

              ],

            ),

          ),

          const SizedBox(height: 22),

          const Text(

            'Orders with dues',

            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Color(0xFF171717)),

          ),

          const SizedBox(height: 12),

          if (data.dueOrders.isEmpty)

            const Padding(

              padding: EdgeInsets.symmetric(vertical: 18),

              child: Text('No due orders.', style: TextStyle(color: Color(0xFF737373))),

            )

          else

            ...data.dueOrders.map((o) {

              return Padding(

                padding: const EdgeInsets.only(bottom: 12),

                child: DiyaCard(

                  onTap: () async {

                    await Navigator.push(

                      context,

                      MaterialPageRoute(builder: (_) => OrderDetailScreen(orderId: o.id)),

                    );

                    if (!mounted) return;

                    await _refresh();

                  },

                  child: Column(

                    crossAxisAlignment: CrossAxisAlignment.start,

                    children: [

                      Text(

                        'Order #: ${o.orderNumber.isEmpty ? o.id : o.orderNumber}',

                        style: const TextStyle(fontWeight: FontWeight.w900),

                      ),

                      const SizedBox(height: 8),

                      Row(

                        children: [

                          Expanded(

                            child: Text(

                              'Total: ₹${o.total.toStringAsFixed(0)}\nOutstanding: ₹${o.outstanding.toStringAsFixed(0)}',

                              style: const TextStyle(color: Color(0xFF525252), height: 1.3),

                            ),

                          ),

                          DiyaButton(

                            text: 'Record Payment',

                            onPressed: () => _showRecordPaymentSheet(order: o),

                          ),

                        ],

                      ),

                    ],

                  ),

                ),

              );

            }),

          const SizedBox(height: 18),

          Row(

            children: [

              const Expanded(

                child: Text(

                  'Payment history',

                  style: TextStyle(

                    fontSize: 18,

                    fontWeight: FontWeight.w900,

                    color: Color(0xFF171717),

                  ),

                ),

              ),

              if (data.payments.isNotEmpty)

                Text(

                  '${data.payments.length} total',

                  style: const TextStyle(fontSize: 13, color: Color(0xFF737373)),

                ),

            ],

          ),

          const SizedBox(height: 12),

          if (data.payments.isEmpty)

            const Padding(

              padding: EdgeInsets.symmetric(vertical: 18),

              child: Text('No payment history.', style: TextStyle(color: Color(0xFF737373))),

            )

          else ...[

            ...visiblePayments.map(_buildPaymentHistoryCard),

            if (hasMoreHistory)

              Padding(

                padding: const EdgeInsets.only(bottom: 24),

                child: DiyaButton(

                  fullWidth: true,

                  text: 'Load more (${data.payments.length - _visibleHistoryCount} remaining)',

                  onPressed: () {

                    setState(() {

                      _visibleHistoryCount += _historyPageSize;

                    });

                  },

                ),

              ),

          ],

        ],

      ),

    );

  }

}



class _DueOrder {

  final String id;

  final String orderNumber;

  final double total;

  final double outstanding;

  final String status;



  const _DueOrder({

    required this.id,

    required this.orderNumber,

    required this.total,

    required this.outstanding,

    required this.status,

  });

}



class _PaymentsData {

  final double outstanding;

  final List<_DueOrder> dueOrders;

  final List<Map<String, dynamic>> payments;



  const _PaymentsData({

    required this.outstanding,

    required this.dueOrders,

    required this.payments,

  });

}


