import 'package:flutter/material.dart';
import '../../services/order_service.dart';
import '../../services/payment_service.dart';
import '../../utils/order_payment_utils.dart';
import '../../widgets/ui/diya_card.dart';

class _OrderDetailData {
  final Map<String, dynamic> order;
  final List<Map<String, dynamic>> payments;

  const _OrderDetailData({required this.order, required this.payments});
}

class OrderDetailScreen extends StatefulWidget {
  final String orderId;

  const OrderDetailScreen({
    super.key,
    required this.orderId,
  });

  @override
  State<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends State<OrderDetailScreen> {
  late Future<_OrderDetailData> _future;

  static String _formatDate(DateTime dt) {
    final d = dt.toLocal();
    return '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';
  }

  static DateTime? _parseDate(dynamic value) {
    if (value == null) return null;
    final s = value.toString().trim();
    if (s.isEmpty) return null;
    return DateTime.tryParse(s);
  }

  Future<_OrderDetailData> _load() async {
    final orderSvc = OrderService();
    final paymentSvc = PaymentService();
    final results = await Future.wait([
      orderSvc.getRetailerOrderDetail(widget.orderId),
      paymentSvc.getRetailerPayments(),
    ]);
    return _OrderDetailData(
      order: results[0] as Map<String, dynamic>,
      payments: List<Map<String, dynamic>>.from(results[1] as List),
    );
  }

  void _reload() {
    setState(() {
      _future = _load();
    });
  }

  @override
  void initState() {
    super.initState();
    _reload();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      appBar: AppBar(
        title: const Text(
          'Order Details',
          style: TextStyle(fontWeight: FontWeight.w900, fontSize: 17),
        ),
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF171717),
        elevation: 0,
      ),
      body: SafeArea(
        child: FutureBuilder<_OrderDetailData>(
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(
                child: CircularProgressIndicator(color: Color(0xFFFF7A00)),
              );
            }

            if (snapshot.hasError) {
              return Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Text(
                    'Failed to load order: ${snapshot.error}',
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      color: Color(0xFF525252),
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              );
            }

            final data = snapshot.data!;
            final order = data.order;
            final summary = buildOrderPaymentSummary(
              order: order,
              payments: data.payments,
              orderId: widget.orderId,
            );
            final orderPayments = paymentsForOrder(data.payments, widget.orderId);

            final wholesaler = order['wholesaler'] as Map<String, dynamic>?;
            final wholesalerName = (wholesaler?['businessName'] ?? 'Wholesaler').toString();
            final orderNumber = (order['orderNumber'] ?? '').toString();
            final status = (order['status'] ?? '').toString();
            final paymentMode = (order['paymentMode'] ?? '').toString();
            final creditDays = (order['creditDays'] as num?)?.toInt() ?? 0;
            final dueDate = _parseDate(order['dueDate']);
            final isOverdue = dueDate != null &&
                summary.paymentStatus != 'PAID' &&
                DateTime.now().isAfter(
                  DateTime(dueDate.year, dueDate.month, dueDate.day, 23, 59, 59),
                );

            final editedAt = _parseDate(order['editedAt']);
            final editReason = (order['editReason'] ?? '').toString();

            final subtotal = parseApiAmount(order['subtotal']);
            final tax = parseApiAmount(order['taxAmount']);
            final delivery = parseApiAmount(order['deliveryCharge']);

            final items =
                (order['orderItems'] is List) ? (order['orderItems'] as List) : const [];

            return RefreshIndicator(
              onRefresh: () async {
                _reload();
                await _future;
              },
              color: const Color(0xFFFF7A00),
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                children: [
                  if (editedAt != null) ...[
                    _sectionCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Order edited',
                            style: TextStyle(
                              fontWeight: FontWeight.w900,
                              fontSize: 15,
                              color: Color(0xFF171717),
                            ),
                          ),
                          if (editReason.isNotEmpty) ...[
                            const SizedBox(height: 8),
                            Text(
                              editReason,
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 13,
                                color: Color(0xFF525252),
                                height: 1.4,
                              ),
                            ),
                          ],
                          const SizedBox(height: 6),
                          Text(
                            _formatDate(editedAt),
                            style: const TextStyle(
                              fontWeight: FontWeight.w600,
                              fontSize: 12,
                              color: Color(0xFF737373),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),
                  ],

                  _sectionCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          wholesalerName,
                          style: const TextStyle(
                            fontWeight: FontWeight.w900,
                            fontSize: 18,
                            color: Color(0xFF171717),
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          orderNumber.isEmpty ? widget.orderId : orderNumber,
                          style: const TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 13,
                            color: Color(0xFF737373),
                          ),
                        ),
                        const SizedBox(height: 16),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            _pill(status.isEmpty ? 'PLACED' : status),
                            _pill(
                              summary.paymentStatus,
                              subtle: true,
                            ),
                            if (paymentMode.isNotEmpty)
                              _pill('Mode: $paymentMode', subtle: true),
                            if (paymentMode == 'CREDIT' && creditDays > 0)
                              _pill('Credit: $creditDays days', subtle: true),
                            if (dueDate != null && summary.showDue)
                              _pill(
                                isOverdue ? 'OVERDUE' : 'Due ${_formatDate(dueDate)}',
                                subtle: !isOverdue,
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 14),

                  _sectionCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Payment summary',
                          style: TextStyle(
                            fontWeight: FontWeight.w900,
                            fontSize: 15,
                            color: Color(0xFF171717),
                          ),
                        ),
                        const SizedBox(height: 16),
                        _amountRow('Order total', summary.total, emphasized: true),
                        if (summary.showDue) ...[
                          const SizedBox(height: 12),
                          _amountRow('Total paid', summary.paidAmount),
                          const SizedBox(height: 12),
                          _amountRow(
                            'Remaining due',
                            summary.outstanding,
                            valueColor: summary.outstanding > 0
                                ? const Color(0xFFB45309)
                                : const Color(0xFF16A34A),
                          ),
                        ],
                      ],
                    ),
                  ),

                  if (orderPayments.isNotEmpty) ...[
                    const SizedBox(height: 14),
                    _sectionCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Payments',
                            style: TextStyle(
                              fontWeight: FontWeight.w900,
                              fontSize: 15,
                              color: Color(0xFF171717),
                            ),
                          ),
                          const SizedBox(height: 12),
                          ...orderPayments.map((p) {
                            final amt = parseApiAmount(p['amount']);
                            final pStatus = (p['status'] ?? '').toString().toUpperCase();
                            final mode = (p['mode'] ?? '').toString();
                            final at = _parseDate(p['confirmedAt'] ?? p['createdAt']);
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 10),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          '₹${amt.toStringAsFixed(0)}${mode.isNotEmpty ? ' • $mode' : ''}',
                                          style: const TextStyle(
                                            fontWeight: FontWeight.w800,
                                            fontSize: 14,
                                            color: Color(0xFF171717),
                                          ),
                                        ),
                                        if (at != null)
                                          Text(
                                            _formatDate(at),
                                            style: const TextStyle(
                                              fontSize: 12,
                                              fontWeight: FontWeight.w600,
                                              color: Color(0xFF737373),
                                            ),
                                          ),
                                      ],
                                    ),
                                  ),
                                  _pill(pStatus.isEmpty ? '—' : pStatus, subtle: true),
                                ],
                              ),
                            );
                          }),
                        ],
                      ),
                    ),
                  ],

                  const SizedBox(height: 14),

                  _sectionCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Order breakdown',
                          style: TextStyle(
                            fontWeight: FontWeight.w900,
                            fontSize: 15,
                            color: Color(0xFF171717),
                          ),
                        ),
                        const SizedBox(height: 14),
                        _amountRow('Subtotal', subtotal),
                        const SizedBox(height: 10),
                        _amountRow('Tax', tax),
                        const SizedBox(height: 10),
                        _amountRow('Delivery', delivery),
                      ],
                    ),
                  ),

                  const SizedBox(height: 18),

                  const Text(
                    'Items',
                    style: TextStyle(
                      fontWeight: FontWeight.w900,
                      fontSize: 15,
                      color: Color(0xFF171717),
                    ),
                  ),
                  const SizedBox(height: 10),

                  if (items.isEmpty)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 8),
                      child: Text(
                        'No items found for this order.',
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF737373),
                        ),
                      ),
                    )
                  else
                    ...items.map((it) {
                      final m =
                          (it is Map) ? it.cast<String, dynamic>() : <String, dynamic>{};
                      final name = (m['productNameSnapshot'] ??
                              m['productName'] ??
                              'Item')
                          .toString();
                      final qty = (m['qty'] as num? ?? 0).toInt();
                      final unitPrice =
                          parseApiAmount(m['unitPriceSnapshot']);
                      final lineTotal = parseApiAmount(m['lineTotal']);

                      final originalQty = (m['originalQty'] as num?)?.toInt();
                      final originalUnitPrice =
                          m['originalUnitPrice'] != null
                              ? parseApiAmount(m['originalUnitPrice'])
                              : null;
                      final originalLineTotal =
                          m['originalLineTotal'] != null
                              ? parseApiAmount(m['originalLineTotal'])
                              : null;

                      return Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: _sectionCard(
                          padding: const EdgeInsets.all(14),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      name,
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w900,
                                        fontSize: 14,
                                        color: Color(0xFF171717),
                                      ),
                                    ),
                                    const SizedBox(height: 8),
                                    if (originalQty != null ||
                                        originalUnitPrice != null ||
                                        originalLineTotal != null) ...[
                                      Text(
                                        'Was ${originalQty ?? qty} × ₹${(originalUnitPrice ?? unitPrice).toStringAsFixed(0)}',
                                        style: const TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w600,
                                          color: Color(0xFF737373),
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        'Now $qty × ₹${unitPrice.toStringAsFixed(0)}',
                                        style: const TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w800,
                                          color: Color(0xFF525252),
                                        ),
                                      ),
                                    ] else
                                      Text(
                                        'Qty $qty × ₹${unitPrice.toStringAsFixed(0)}',
                                        style: const TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w600,
                                          color: Color(0xFF737373),
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 12),
                              Text(
                                '₹${lineTotal.toStringAsFixed(0)}',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w900,
                                  fontSize: 15,
                                  color: Color(0xFF171717),
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    }),
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _sectionCard({required Widget child, EdgeInsets? padding}) {
    return DiyaCard(
      padding: padding ?? const EdgeInsets.all(18),
      child: child,
    );
  }

  Widget _amountRow(
    String label,
    double value, {
    bool emphasized = false,
    Color? valueColor,
  }) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontWeight: FontWeight.w600,
            fontSize: emphasized ? 14 : 13,
            color: const Color(0xFF737373),
          ),
        ),
        Text(
          '₹${value.toStringAsFixed(0)}',
          style: TextStyle(
            fontWeight: FontWeight.w900,
            fontSize: emphasized ? 20 : 15,
            color: valueColor ?? const Color(0xFF171717),
          ),
        ),
      ],
    );
  }

  Widget _pill(String text, {bool subtle = false}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: subtle ? const Color(0xFFF5F5F5) : const Color(0xFFFFE7D1),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 11.5,
          fontWeight: FontWeight.w800,
          color: subtle ? const Color(0xFF404040) : const Color(0xFFFF7A00),
        ),
      ),
    );
  }
}
