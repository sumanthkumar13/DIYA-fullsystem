import 'safe_json.dart';

/// Parses API amounts whether encoded as num or string (BigDecimal JSON).
double parseApiAmount(dynamic value) {
  if (value == null) return 0;
  if (value is num) return value.toDouble();
  if (value is String) return double.tryParse(value.trim()) ?? 0;
  return double.tryParse(value.toString()) ?? 0;
}

bool orderStatusAllowsDue(String status) {
  final s = status.toUpperCase();
  return s != 'PLACED' && s != 'REJECTED' && s != 'CANCELLED';
}

/// Sum of CONFIRMED payments for [orderId] from retailer payment history.
double confirmedPaidFromPayments(
  List<Map<String, dynamic>> payments,
  String orderId,
) {
  var sum = 0.0;
  for (final p in payments) {
    final status = (p['status'] ?? '').toString().toUpperCase();
    if (status != 'CONFIRMED') continue;

    final oid = (p['orderId'] ?? '').toString().trim();
    final resolved = oid.isNotEmpty ? oid : orderIdFromPayment(p);
    if (resolved != orderId) continue;

    sum += parseApiAmount(p['amount']);
  }
  return sum;
}

class OrderPaymentSummary {
  final double total;
  final double paidAmount;
  final double outstanding;
  final String paymentStatus;
  final bool showDue;

  const OrderPaymentSummary({
    required this.total,
    required this.paidAmount,
    required this.outstanding,
    required this.paymentStatus,
    required this.showDue,
  });
}

OrderPaymentSummary buildOrderPaymentSummary({
  required Map<String, dynamic> order,
  required List<Map<String, dynamic>> payments,
  required String orderId,
}) {
  final status = (order['status'] ?? '').toString();
  final total = parseApiAmount(order['totalAmount']);
  final allowsDue = orderStatusAllowsDue(status);

  final fromPayments = confirmedPaidFromPayments(payments, orderId);
  final fromOrder = parseApiAmount(order['paidAmount']);
  final paid = fromPayments > 0 ? fromPayments : fromOrder;

  var outstanding = parseApiAmount(order['outstandingAmount']);
  if (outstanding <= 0) {
    outstanding = parseApiAmount(order['unpaidAmount']);
  }
  if (outstanding <= 0 && allowsDue) {
    outstanding = (total - paid).clamp(0.0, double.infinity);
  }
  if (!allowsDue) {
    outstanding = 0;
  } else {
    outstanding = outstanding.clamp(0.0, double.infinity);
  }

  String paymentStatus = (order['paymentStatus'] ?? '').toString().toUpperCase();
  if (!allowsDue) {
    paymentStatus = paymentStatus.isEmpty ? 'UNPAID' : paymentStatus;
  } else if (outstanding <= 0.009) {
    paymentStatus = paid > 0 ? 'PAID' : 'UNPAID';
  } else if (paid > 0.009) {
    paymentStatus = 'PARTIAL';
  } else {
    paymentStatus = 'UNPAID';
  }

  return OrderPaymentSummary(
    total: total,
    paidAmount: paid,
    outstanding: outstanding,
    paymentStatus: paymentStatus,
    showDue: allowsDue,
  );
}

List<Map<String, dynamic>> paymentsForOrder(
  List<Map<String, dynamic>> payments,
  String orderId,
) {
  return payments.where((p) {
    final oid = (p['orderId'] ?? '').toString().trim();
    final resolved = oid.isNotEmpty ? oid : orderIdFromPayment(p);
    return resolved == orderId;
  }).toList();
}
