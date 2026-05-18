class CartDTO {
  final String id;
  final String wholesalerId;
  final String wholesalerName;
  final List<CartItemDTO> items;
  final double totalAmount;
  final int totalItems;

  CartDTO({
    required this.id,
    required this.wholesalerId,
    required this.wholesalerName,
    required this.items,
    required this.totalAmount,
    required this.totalItems,
  });

  factory CartDTO.fromJson(Map<String, dynamic> json) {
    return CartDTO(
      id: (json['id'] ?? '').toString(),
      wholesalerId: (json['wholesalerId'] ?? '').toString(),
      wholesalerName: (json['wholesalerName'] ?? '').toString(),
      items: (json['items'] as List<dynamic>? ?? [])
          .map((e) => CartItemDTO.fromJson(e as Map<String, dynamic>))
          .toList(),
      totalAmount: (json['totalAmount'] as num? ?? 0).toDouble(),
      totalItems: (json['totalItems'] as num? ?? 0).toInt(),
    );
  }

  CartDTO copyWith({
    List<CartItemDTO>? items,
    double? totalAmount,
    int? totalItems,
  }) {
    return CartDTO(
      id: id,
      wholesalerId: wholesalerId,
      wholesalerName: wholesalerName,
      items: items ?? this.items,
      totalAmount: totalAmount ?? this.totalAmount,
      totalItems: totalItems ?? this.totalItems,
    );
  }

  int quantityFor(String productId) {
    for (final item in items) {
      if (item.productId == productId) return item.quantity;
    }
    return 0;
  }
}

class CartItemDTO {
  final String id;
  final String productId;
  final String productName;
  final String productSku;
  final String? productImageUrl;
  final int quantity;
  final double price;
  final double mrp;
  final double total;
  final String status;

  CartItemDTO({
    required this.id,
    required this.productId,
    required this.productName,
    required this.productSku,
    required this.productImageUrl,
    required this.quantity,
    required this.price,
    required this.mrp,
    required this.total,
    required this.status,
  });

  factory CartItemDTO.fromJson(Map<String, dynamic> json) {
    return CartItemDTO(
      id: (json['id'] ?? '').toString(),
      productId: (json['productId'] ?? '').toString(),
      productName: (json['productName'] ?? '').toString(),
      productSku: (json['productSku'] ?? '').toString(),
      productImageUrl: json['productImageUrl']?.toString(),
      quantity: (json['quantity'] as num? ?? 0).toInt(),
      price: (json['price'] as num? ?? 0).toDouble(),
      mrp: (json['mrp'] as num? ?? 0).toDouble(),
      total: (json['total'] as num? ?? 0).toDouble(),
      status: (json['status'] ?? 'In Stock').toString(),
    );
  }

  CartItemDTO copyWith({int? quantity, double? total}) {
    return CartItemDTO(
      id: id,
      productId: productId,
      productName: productName,
      productSku: productSku,
      productImageUrl: productImageUrl,
      quantity: quantity ?? this.quantity,
      price: price,
      mrp: mrp,
      total: total ?? this.total,
      status: status,
    );
  }
}
