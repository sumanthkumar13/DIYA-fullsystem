import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../widgets/ui/diya_card.dart';
import '../../widgets/ui/diya_input.dart';
import '../../widgets/ui/diya_button.dart';
import '../../services/order_service.dart';
import '../../services/payment_service.dart';
import '../../providers/retailer_session_provider.dart';
import '../orders/order_detail_screen.dart';

class PaymentsScreen extends ConsumerStatefulWidget {
  const PaymentsScreen({super.key});

  @override
  ConsumerState<PaymentsScreen> createState() => _PaymentsScreenState();
}

class _PaymentsScreenState extends ConsumerState<PaymentsScreen> {
  late Future<_PaymentsData> _dataFuture;

  @override
  void initState() {
    super.initState();
    _dataFuture = _load();
    // Fresh fetch on page entry (no stale values after navigation)
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(retailerSessionProvider.notifier).sync();
    });
  }

  Future<void> _refresh() async {
    setState(() {
      _dataFuture = _load();
    });
    await _dataFuture;
  }

  Future<_PaymentsData> _load() async {
    final paymentSvc = PaymentService();
    final orderSvc = OrderService();
    final results = await Future.wait([
      paymentSvc.getRetailerLedgerEntries(),
      orderSvc.getRetailerOrders(),
      paymentSvc.getRetailerPayments(),
    ]);

    // Keep ledger fetch for compatibility/future UI, but do not use it to compute outstanding.
    final ledgerEntries = results[0] as List<Map<String, dynamic>>;
    final orders = results[1] as List<Map<String, dynamic>>;
    final payments = results[2] as List<Map<String, dynamic>>;

    // Single source of truth: compute outstanding from orders minus CONFIRMED payments (never negative).

    final confirmedByOrderId = <String, double>{};
    for (final p in payments) {
      final status = (p["status"] ?? "").toString().toUpperCase();
      if (status != "CONFIRMED") continue;
      final order = p["order"];
      if (order is! Map) continue;
      final oid = (order["id"] ?? "").toString();
      if (oid.isEmpty) continue;
      final amt = (p["amount"] as num? ?? 0).toDouble();
      confirmedByOrderId[oid] = (confirmedByOrderId[oid] ?? 0) + amt;
    }

    final dueOrders = orders.map((o) {
      final orderId = (o["id"] ?? "").toString();
      final total = (o["amount"] as num? ?? o["totalAmount"] as num? ?? 0).toDouble();
      final confirmed = confirmedByOrderId[orderId] ?? 0;
      final remaining = (total - confirmed);
      final status = (o["status"] ?? "").toString().toUpperCase();
      return _DueOrder(
        id: orderId,
        orderNumber: (o["orderNumber"] ?? o["orderNo"] ?? "").toString(),
        total: total,
        outstanding: remaining < 0 ? 0 : remaining,
        status: status,
      );
    })
        // Only allow recording payments for orders that wholesaler has accepted (or later)
        .where((o) =>
            o.outstanding > 0.01 &&
            o.status.isNotEmpty &&
            o.status != "PLACED" &&
            o.status != "REJECTED" &&
            o.status != "CANCELLED")
        .toList()
      ..sort((a, b) => b.outstanding.compareTo(a.outstanding));

    // Keep it strictly `double` (clamp() returns `num`, which breaks _PaymentsData typing).
    final outstanding = dueOrders.fold<double>(0.0, (sum, o) => sum + o.outstanding);

    payments.sort((a, b) {
      final ad = DateTime.tryParse((a["createdAt"] ?? "").toString()) ?? DateTime.fromMillisecondsSinceEpoch(0);
      final bd = DateTime.tryParse((b["createdAt"] ?? "").toString()) ?? DateTime.fromMillisecondsSinceEpoch(0);
      return bd.compareTo(ad);
    });

    return _PaymentsData(
      outstanding: outstanding,
      dueOrders: dueOrders,
      payments: payments,
    );
  }

  Future<void> _showRecordPaymentSheet({
    required _DueOrder order,
  }) async {
    final amountController = TextEditingController(text: order.outstanding.toStringAsFixed(0));
    final referenceController = TextEditingController();
    final noteController = TextEditingController();

    String mode = "UPI";

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) {
        return Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 18,
            bottom: MediaQuery.of(context).viewInsets.bottom + 20,
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
              Text(
                "Record Payment",
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 18),

              DiyaInput(
                hintText: "Enter Amount",
                controller: amountController,
                keyboardType: TextInputType.number,
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w900,
                ),
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
                      DropdownMenuItem(value: "UPI", child: Text("UPI")),
                      DropdownMenuItem(value: "BANK_TRANSFER", child: Text("Bank Transfer")),
                      DropdownMenuItem(value: "CASH", child: Text("Cash")),
                      DropdownMenuItem(value: "CHEQUE", child: Text("Cheque")),
                    ],
                    onChanged: (v) {
                      if (v == null) return;
                      mode = v;
                      setState(() {});
                    },
                  ),
                ),
              ),

              const SizedBox(height: 12),

              DiyaInput(
                hintText: "Reference ID (optional)",
                controller: referenceController,
                keyboardType: TextInputType.text,
              ),

              const SizedBox(height: 12),

              DiyaInput(
                hintText: "Note (optional)",
                controller: noteController,
                keyboardType: TextInputType.text,
              ),

              const SizedBox(height: 18),

              DiyaButton(
                fullWidth: true,
                text: "Record Payment",
                onPressed: () async {
                  final amount = num.tryParse(amountController.text.trim());
                  if (amount == null || amount <= 0) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text("Enter a valid amount")),
                    );
                    return;
                  }

                  try {
                    await PaymentService().recordRetailerPayment(
                      orderId: order.id,
                      amount: amount,
                      mode: mode,
                      reference: referenceController.text.trim().isEmpty ? null : referenceController.text.trim(),
                      note: noteController.text.trim().isEmpty ? null : noteController.text.trim(),
                    );
                    // Reactive global refresh (dashboard/orders/ledger)
                    await ref.read(retailerSessionProvider.notifier).sync();
                    if (!mounted) return;
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text("Payment recorded (Pending verification)")),
                    );
                    await _refresh();
                  } catch (_) {
                    if (!mounted) return;
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text("Failed to record payment")),
                    );
                  }
                },
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    // ✅ IMPORTANT:
    // This screen must NOT return RetailerShell or Scaffold.
    // main.dart already wraps /payments with RetailerShell.

    return RefreshIndicator(
      onRefresh: _refresh,
      color: const Color(0xFFFF7A00),
      child: FutureBuilder<_PaymentsData>(
        future: _dataFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return ListView(
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
            );
          }

          final data = snapshot.data ??
              const _PaymentsData(outstanding: 0, dueOrders: [], payments: []);

          return ListView(
            children: [
              // Outstanding Card
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
                    )
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      "Outstanding Balance",
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFFA3A3A3),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      "₹${data.outstanding.toStringAsFixed(0)}",
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
                "Orders with dues",
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w900,
                  color: Color(0xFF171717),
                ),
              ),
              const SizedBox(height: 12),

              if (data.dueOrders.isEmpty)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 18),
                  child: Text(
                    "No due orders.",
                    style: TextStyle(color: Color(0xFF737373)),
                  ),
                )
              else
                ...data.dueOrders.map((o) {
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: DiyaCard(
                      onTap: () async {
                        await Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => OrderDetailScreen(orderId: o.id),
                          ),
                        );
                        if (!mounted) return;
                        await _refresh();
                      },
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            "Order #: ${o.orderNumber.isEmpty ? o.id : o.orderNumber}",
                            style: const TextStyle(fontWeight: FontWeight.w900),
                          ),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  "Total: ₹${o.total.toStringAsFixed(0)}\nOutstanding: ₹${o.outstanding.toStringAsFixed(0)}",
                                  style: const TextStyle(color: Color(0xFF525252), height: 1.3),
                                ),
                              ),
                              DiyaButton(
                                text: "Record Payment",
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

              const Text(
                "Payment history",
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w900,
                  color: Color(0xFF171717),
                ),
              ),
              const SizedBox(height: 12),

              if (data.payments.isEmpty)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 18),
                  child: Text(
                    "No payment history.",
                    style: TextStyle(color: Color(0xFF737373)),
                  ),
                )
              else
                ...data.payments.map((p) {
                  final amt = (p["amount"] as num? ?? 0).toDouble();
                  final mode = (p["mode"] ?? "-").toString();
                  final ref = (p["reference"] ?? "").toString();
                  final status = (p["status"] ?? "").toString();
                  final createdAt = DateTime.tryParse((p["createdAt"] ?? "").toString());

                  final order = p["order"];
                  String orderRef = "";
                  if (order is Map) {
                    final orderNumber = (order["orderNumber"] ?? "").toString();
                    final oid = (order["id"] ?? "").toString();
                    orderRef = orderNumber.isNotEmpty ? "Order #$orderNumber" : (oid.isNotEmpty ? "Order #${oid.substring(0, 8)}" : "");
                  }

                  Color badgeBg = const Color(0xFFF5F5F5);
                  Color badgeFg = const Color(0xFF404040);
                  String statusLabel = status;
                  final su = status.toUpperCase();
                  if (su.contains("PENDING")) {
                    badgeBg = const Color(0xFFFEF3C7);
                    badgeFg = const Color(0xFFB45309);
                    statusLabel = "Pending";
                  } else if (su == "CONFIRMED") {
                    badgeBg = const Color(0xFFDCFCE7);
                    badgeFg = const Color(0xFF16A34A);
                    statusLabel = "Confirmed";
                  } else if (su == "REJECTED") {
                    badgeBg = const Color(0xFFFEE2E2);
                    badgeFg = const Color(0xFFDC2626);
                    statusLabel = "Rejected";
                  }

                  return Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: DiyaCard(
                      child: Row(
                        children: [
                          Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              color: badgeBg,
                              shape: BoxShape.circle,
                            ),
                            child: Icon(
                              Icons.payments_outlined,
                              color: badgeFg,
                              size: 20,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  orderRef.isEmpty
                                      ? "₹${amt.toStringAsFixed(0)} • $mode"
                                      : "₹${amt.toStringAsFixed(0)} paid for $orderRef • $mode",
                                  style: const TextStyle(fontWeight: FontWeight.w900),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  [
                                    if (createdAt != null)
                                      "${createdAt.day}/${createdAt.month}/${createdAt.year}",
                                    if (ref.isNotEmpty) "Ref: $ref",
                                  ].join(" • "),
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
                }),
            ],
          );
        },
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
