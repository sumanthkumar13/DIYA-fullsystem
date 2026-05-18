import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../widgets/catalogue/product_card.dart';
import '../../widgets/catalogue/catalogue_go_to_cart_bar.dart';
import '../../providers/cart_provider.dart';
import 'catalogue_models.dart';

class SubcategoryCatalogueScreen extends ConsumerWidget {
  final String wholesalerId;
  final String wholesalerName;
  final String categoryName;
  final CatalogueSubcategory subcategory;

  const SubcategoryCatalogueScreen({
    super.key,
    required this.wholesalerId,
    required this.wholesalerName,
    required this.categoryName,
    required this.subcategory,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final products = subcategory.products;
    final cartCount = ref.watch(cartBadgeCountProvider);
    final bottomInset = catalogueScrollBottomInset(cartCount);

    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      appBar: AppBar(
        title: Text(
          subcategory.name,
          style: const TextStyle(fontWeight: FontWeight.w900),
        ),
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF171717),
        elevation: 0,
      ),
      body: CatalogueGoToCartOverlay(
        child: SafeArea(
          child: products.isEmpty
              ? const Center(
                  child: Padding(
                    padding: EdgeInsets.all(24),
                    child: Text(
                      'No products found in this subcategory.',
                      style: TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF737373)),
                      textAlign: TextAlign.center,
                    ),
                  ),
                )
              : Padding(
                  padding: EdgeInsets.fromLTRB(16, 16, 16, bottomInset),
                  child: GridView.builder(
                    itemCount: products.length,
                    physics: const AlwaysScrollableScrollPhysics(),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                      childAspectRatio: 0.62,
                    ),
                    itemBuilder: (context, i) {
                      final p = products[i];
                      return ProductCard(product: p);
                    },
                  ),
                ),
        ),
      ),
    );
  }
}

