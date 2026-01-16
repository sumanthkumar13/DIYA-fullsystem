class OrderCheckoutRequest {
  final String wholesalerId;
  final String? paymentMethod;
  final String? paymentReference;

  OrderCheckoutRequest({
    required this.wholesalerId,
    this.paymentMethod,
    this.paymentReference,
  });

  Map<String, dynamic> toJson() => {
        "wholesalerId": wholesalerId,
        "paymentMethod": paymentMethod,
        "paymentReference": paymentReference,
      };
}

class OrderCheckoutResponse {
  final String orderId;
  final String orderNumber;
  final double totalAmount;
  final String message;

  OrderCheckoutResponse({
    required this.orderId,
    required this.orderNumber,
    required this.totalAmount,
    required this.message,
  });

  factory OrderCheckoutResponse.fromJson(Map<String, dynamic> json) {
    return OrderCheckoutResponse(
      orderId: (json["orderId"] ?? "").toString(),
      orderNumber: (json["orderNumber"] ?? "").toString(),
      totalAmount: (json["totalAmount"] as num? ?? 0).toDouble(),
      message: (json["message"] ?? "").toString(),
    );
  }
}
