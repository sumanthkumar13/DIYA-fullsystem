import 'package:flutter/material.dart';
import '../../services/order_service.dart';
import '../../widgets/ui/diya_card.dart';

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
  late Future<Map<String, dynamic>> _future;

  @override
  void initState() {
    super.initState();
    _future = OrderService().getRetailerOrderDetail(widget.orderId);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      appBar: AppBar(
        title: const Text(
          'Order Details',
          style: TextStyle(fontWeight: FontWeight.w900),
        ),
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF171717),
        elevation: 0,
      ),
      body: SafeArea(
        child: FutureBuilder<Map<String, dynamic>>(
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

            final data = snapshot.data ?? {};

            final wholesaler = data['wholesaler'] as Map<String, dynamic>?;
            final wholesalerName = (wholesaler?['businessName'] ?? 'Wholesaler').toString();

            final orderNumber = (data['orderNumber'] ?? '').toString();
            final status = (data['status'] ?? '').toString();
            final paymentStatus = (data['paymentStatus'] ?? '').toString();
            final paymentMode = (data['paymentMode'] ?? '').toString();
            final creditDays = (data['creditDays'] as num?)?.toInt() ?? 0;
            final dueDateStr = (data['dueDate'] ?? '').toString();
            final dueDate = dueDateStr.isEmpty ? null : DateTime.tryParse(dueDateStr);
            final isOverdue =
                dueDate != null && paymentStatus != 'PAID' && DateTime.now().isAfter(dueDate);

            final editedAt = data['editedAt']; // ISO string or null
            final editReason = (data['editReason'] ?? '').toString();

            final total = (data['totalAmount'] as num? ?? 0).toDouble();
            final subtotal = (data['subtotal'] as num? ?? 0).toDouble();
            final tax = (data['taxAmount'] as num? ?? 0).toDouble();
            final delivery = (data['deliveryCharge'] as num? ?? 0).toDouble();

            final items = (data['orderItems'] is List) ? (data['orderItems'] as List) : const [];

            return SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (editedAt != null) ...[
                    DiyaCard(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Order Edited by Wholesaler',
                            style: TextStyle(
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF171717),
                            ),
                          ),
                          const SizedBox(height: 6),
                          if (editReason.isNotEmpty)
                            Text(
                              'Reason: $editReason',
                              style: const TextStyle(
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF525252),
                              ),
                            ),
                          const SizedBox(height: 6),
                          Text(
                            'Edited at: ${editedAt.toString()}',
                            style: const TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 12,
                              color: Color(0xFF737373),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],
                  DiyaCard(
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
                        const SizedBox(height: 4),
                        Text(
                          orderNumber.isEmpty ? widget.orderId : orderNumber,
                          style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 12,
                            color: Color(0xFF737373),
                          ),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            _pill(status.isEmpty ? 'PLACED' : status),
                            const SizedBox(width: 8),
                            _pill('Payment: ${paymentStatus.isEmpty ? 'UNPAID' : paymentStatus}', subtle: true),
                          ],
                        ),
                        if (paymentMode.isNotEmpty) ...[
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              _pill('Mode: $paymentMode', subtle: true),
                              if (paymentMode == 'CREDIT' && creditDays > 0) ...[
                                const SizedBox(width: 8),
                                _pill('Credit: $creditDays days', subtle: true),
                              ],
                              if (dueDate != null) ...[
                                const SizedBox(width: 8),
                                _pill(
                                  isOverdue ? 'OVERDUE' : 'Due: ${dueDate.toLocal().toString().split(".").first}',
                                  subtle: !isOverdue,
                                ),
                              ],
                            ],
                          ),
                        ],
                        const SizedBox(height: 14),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              'Total',
                              style: TextStyle(
                                fontWeight: FontWeight.w800,
                                color: Color(0xFF525252),
                              ),
                            ),
                            Text(
                              '₹${total.toStringAsFixed(0)}',
                              style: const TextStyle(
                                fontWeight: FontWeight.w900,
                                fontSize: 18,
                                color: Color(0xFF171717),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        const Divider(height: 1, color: Color(0xFFF5F5F5)),
                        const SizedBox(height: 10),
                        _kv('Subtotal', subtotal),
                        _kv('Tax', tax),
                        _kv('Delivery', delivery),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  if (items.isNotEmpty) ...[
                    const Text(
                      'Items',
                      style: TextStyle(
                        fontWeight: FontWeight.w900,
                        fontSize: 14,
                        color: Color(0xFF171717),
                      ),
                    ),
                    const SizedBox(height: 8),
                    ...items.map((it) {
                      final m = (it is Map) ? it.cast<String, dynamic>() : <String, dynamic>{};
                      final name = (m['productNameSnapshot'] ?? m['productName'] ?? 'Item').toString();
                      final qty = (m['qty'] as num? ?? 0).toInt();
                      final unitPrice = (m['unitPriceSnapshot'] as num? ?? 0).toDouble();
                      final lineTotal = (m['lineTotal'] as num? ?? 0).toDouble();

                      final originalQty = (m['originalQty'] as num?)?.toInt();
                      final originalUnitPrice = (m['originalUnitPrice'] as num?)?.toDouble();
                      final originalLineTotal = (m['originalLineTotal'] as num?)?.toDouble();

                      return Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: DiyaCard(
                          padding: const EdgeInsets.all(12),
                          child: Row(
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
                                        color: Color(0xFF171717),
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    if (originalQty != null ||
                                        originalUnitPrice != null ||
                                        originalLineTotal != null) ...[
                                      Text(
                                        'Original: ${originalQty ?? qty} × ₹${(originalUnitPrice ?? unitPrice).toStringAsFixed(0)} = ₹${(originalLineTotal ?? (originalUnitPrice ?? unitPrice) * (originalQty ?? qty)).toStringAsFixed(0)}',
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w800,
                                          fontSize: 12,
                                          color: Color(0xFF737373),
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        'Updated: $qty × ₹${unitPrice.toStringAsFixed(0)} = ₹${lineTotal.toStringAsFixed(0)}',
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w900,
                                          fontSize: 12,
                                          color: Color(0xFF171717),
                                        ),
                                      ),
                                    ] else ...[
                                      Text(
                                        'Qty: $qty',
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w700,
                                          fontSize: 12,
                                          color: Color(0xFF737373),
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                              const SizedBox(width: 12),
                              Text(
                                '₹${lineTotal.toStringAsFixed(0)}',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w900,
                                  color: Color(0xFF171717),
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    }).toList(),
                  ] else ...[
                    const SizedBox(height: 8),
                    const Text(
                      'No items found for this order.',
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF737373),
                      ),
                    ),
                  ],
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _kv(String label, double value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontWeight: FontWeight.w700,
              color: Color(0xFF737373),
            ),
          ),
          Text(
            '₹${value.toStringAsFixed(0)}',
            style: const TextStyle(
              fontWeight: FontWeight.w900,
              color: Color(0xFF171717),
            ),
          ),
        ],
      ),
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
          fontSize: 12,
          fontWeight: FontWeight.w900,
          color: subtle ? const Color(0xFF404040) : const Color(0xFFFF7A00),
        ),
      ),
    );
  }
}
