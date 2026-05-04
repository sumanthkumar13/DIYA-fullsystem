import '../../models/products/product_dto.dart';

class CatalogueCategory {
  final String id;
  final String name;
  final List<ProductResponseDTO> products; // products directly under category (no subcategory)
  final List<CatalogueSubcategory> subcategories;

  const CatalogueCategory({
    required this.id,
    required this.name,
    required this.products,
    required this.subcategories,
  });
}

class CatalogueSubcategory {
  final String id;
  final String name;
  final List<ProductResponseDTO> products;

  const CatalogueSubcategory({
    required this.id,
    required this.name,
    required this.products,
  });
}

