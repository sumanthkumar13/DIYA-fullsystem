class ProductResponseDTO {
  final String id;
  final String sku;
  final int? sequenceNumber;
  final String name;
  final String? description;
  final String? unit;
  final double price;
  final double mrp;
  final int? stock;
  final String status; // In Stock | Low Stock | Out of Stock
  final String? imageUrl;

  final String? categoryId;
  final String? categoryName;
  final String? subcategoryId;
  final String? subcategoryName;

  final bool? isActive;
  final bool? visibleToRetailer;

  ProductResponseDTO({
    required this.id,
    required this.sku,
    required this.sequenceNumber,
    required this.name,
    required this.description,
    required this.unit,
    required this.price,
    required this.mrp,
    required this.stock,
    required this.status,
    required this.imageUrl,
    required this.categoryId,
    required this.categoryName,
    required this.subcategoryId,
    required this.subcategoryName,
    required this.isActive,
    required this.visibleToRetailer,
  });

  factory ProductResponseDTO.fromJson(Map<String, dynamic> json) {
    return ProductResponseDTO(
      id: (json['id'] ?? '').toString(),
      sku: (json['sku'] ?? '').toString(),
      sequenceNumber: (json['sequenceNumber'] as num?)?.toInt(),
      name: (json['name'] ?? '').toString(),
      description: json['description']?.toString(),
      unit: json['unit']?.toString(),
      price: (json['price'] as num? ?? 0).toDouble(),
      mrp: (json['mrp'] as num? ?? 0).toDouble(),
      stock: (json['stock'] as num?)?.toInt(),
      status: (json['status'] ?? 'In Stock').toString(),
      imageUrl: json['imageUrl']?.toString(),
      categoryId: json['categoryId']?.toString(),
      categoryName: json['categoryName']?.toString(),
      subcategoryId: json['subcategoryId']?.toString(),
      subcategoryName: json['subcategoryName']?.toString(),
      isActive: json['isActive'] as bool?,
      visibleToRetailer: json['visibleToRetailer'] as bool?,
    );
  }
}

class ProductDetailDTO {
  final String id;
  final String sku;
  final String name;
  final String? description;
  final String? unit;
  final double price;
  final double mrp;
  final int? stock;
  final String status;
  final String? imageUrl;

  final String? categoryId;
  final String? categoryName;
  final String? subcategoryId;
  final String? subcategoryName;

  final bool visibleToRetailer;

  final String wholesalerName;
  final String wholesalerCity;

  ProductDetailDTO({
    required this.id,
    required this.sku,
    required this.name,
    required this.description,
    required this.unit,
    required this.price,
    required this.mrp,
    required this.stock,
    required this.status,
    required this.imageUrl,
    required this.categoryId,
    required this.categoryName,
    required this.subcategoryId,
    required this.subcategoryName,
    required this.visibleToRetailer,
    required this.wholesalerName,
    required this.wholesalerCity,
  });

  factory ProductDetailDTO.fromJson(Map<String, dynamic> json) {
    return ProductDetailDTO(
      id: (json['id'] ?? '').toString(),
      sku: (json['sku'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      description: json['description']?.toString(),
      unit: json['unit']?.toString(),
      price: (json['price'] as num? ?? 0).toDouble(),
      mrp: (json['mrp'] as num? ?? 0).toDouble(),
      stock: (json['stock'] as num?)?.toInt(),
      status: (json['status'] ?? 'In Stock').toString(),
      imageUrl: json['imageUrl']?.toString(),
      categoryId: json['categoryId']?.toString(),
      categoryName: json['categoryName']?.toString(),
      subcategoryId: json['subcategoryId']?.toString(),
      subcategoryName: json['subcategoryName']?.toString(),
      visibleToRetailer: (json['visibleToRetailer'] as bool?) ?? true,
      wholesalerName: (json['wholesalerName'] ?? '').toString(),
      wholesalerCity: (json['wholesalerCity'] ?? '').toString(),
    );
  }
}
