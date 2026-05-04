import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/cart_provider.dart';
import '../../widgets/catalogue/product_card.dart';
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
      body: SafeArea(
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
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 20),
                child: GridView.builder(
                  itemCount: products.length,
                  physics: const AlwaysScrollableScrollPhysics(),
                  shrinkWrap: false,
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                    // More height so ProductCard (image+texts+button) never overflows.
                    childAspectRatio: 0.62,
                  ),
                  itemBuilder: (context, i) {
                    final p = products[i];
                    return ProductCard(
                      product: p,
                      onAdd: () async {
                        await ref.read(cartProvider.notifier).addItem(p.id);
                        if (!context.mounted) return;
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('${p.name} added to cart')),
                        );
                      },
                    );
                  },
                ),
              ),
      ),
    );
  }
}

