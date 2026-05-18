import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../widgets/catalogue/product_card.dart';
import '../../widgets/catalogue/catalogue_go_to_cart_bar.dart';
import '../../providers/cart_provider.dart';
import 'catalogue_models.dart';
import 'subcategory_catalogue_screen.dart';

class CategoryCatalogueScreen extends ConsumerWidget {
  final String wholesalerId;
  final String wholesalerName;
  final CatalogueCategory category;

  const CategoryCatalogueScreen({
    super.key,
    required this.wholesalerId,
    required this.wholesalerName,
    required this.category,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final subs = category.subcategories;
    final products = category.products;
    final cartCount = ref.watch(cartBadgeCountProvider);
    final bottomInset = catalogueScrollBottomInset(cartCount);

    // Layout safety: avoid "Bottom overflowed" on small screens by using
    // compact subcategory tiles (no fixed-height buttons with long labels).
    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      appBar: AppBar(
        title: Text(
          category.name,
          style: const TextStyle(fontWeight: FontWeight.w900),
        ),
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF171717),
        elevation: 0,
      ),
      body: CatalogueGoToCartOverlay(
        child: SafeArea(
          child: CustomScrollView(
          slivers: [
            if (subs.isNotEmpty) ...[
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 10),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Subcategories',
                        style: TextStyle(
                          fontWeight: FontWeight.w900,
                          fontSize: 16,
                          color: Color(0xFF171717),
                        ),
                      ),
                      const SizedBox(height: 10),
                    ],
                  ),
                ),
              ),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 6),
                sliver: SliverGrid(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                    childAspectRatio: 2.2,
                  ),
                  delegate: SliverChildBuilderDelegate(
                    (context, i) {
                      final s = subs[i];
                      final initial = s.name.trim().isEmpty ? '?' : s.name.trim()[0].toUpperCase();
                      return _SubTile(
                        initial: initial,
                        label: s.name,
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => SubcategoryCatalogueScreen(
                                wholesalerId: wholesalerId,
                                wholesalerName: wholesalerName,
                                categoryName: category.name,
                                subcategory: s,
                              ),
                            ),
                          );
                        },
                      );
                    },
                    childCount: subs.length,
                  ),
                ),
              ),
            ],

            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 6, 16, 10),
                child: Text(
                  'Products',
                  style: TextStyle(
                    fontWeight: FontWeight.w900,
                    fontSize: 16,
                    color: const Color(0xFF171717),
                  ),
                ),
              ),
            ),

            if (products.isEmpty)
              const SliverToBoxAdapter(
                child: Padding(
                  padding: EdgeInsets.fromLTRB(16, 6, 16, 20),
                  child: Text(
                    'No products found in this category.',
                    style: TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF737373)),
                  ),
                ),
              )
            else
              SliverPadding(
                padding: EdgeInsets.fromLTRB(16, 0, 16, bottomInset),
                sliver: SliverGrid(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                    childAspectRatio: 0.62,
                  ),
                  delegate: SliverChildBuilderDelegate(
                    (context, i) {
                      final p = products[i];
                      return ProductCard(product: p);
                    },
                    childCount: products.length,
                  ),
                ),
              ),
          ],
        ),
        ),
      ),
    );
  }
}

class _SubTile extends StatelessWidget {
  final String initial;
  final String label;
  final VoidCallback onTap;

  const _SubTile({
    required this.initial,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: const Color(0xFFF5F5F5)),
            boxShadow: const [
              BoxShadow(
                color: Color(0x0A000000),
                blurRadius: 10,
                offset: Offset(0, 4),
              )
            ],
          ),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: const Color(0xFFFFE7D1),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Center(
                  child: Text(
                    initial,
                    style: const TextStyle(
                      fontWeight: FontWeight.w900,
                      color: Color(0xFFFF7A00),
                      fontSize: 16,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  label,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF171717),
                    fontSize: 13,
                    height: 1.2,
                  ),
                ),
              ),
              const SizedBox(width: 6),
              const Icon(
                Icons.chevron_right,
                size: 20,
                color: Color(0xFFA3A3A3),
              )
            ],
          ),
        ),
      ),
    );
  }
}

