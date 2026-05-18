import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../models/products/product_dto.dart';
import '../../providers/cart_provider.dart';
import '../../providers/selected_wholesaler_provider.dart';
import '../../services/product_service.dart';
import '../../services/order_service.dart';
import '../../widgets/catalogue/product_card.dart';
import '../../widgets/catalogue/catalogue_go_to_cart_bar.dart';
import '../../widgets/ui/diya_card.dart';
import '../../widgets/wholesalers/wholesaler_catalogue_header.dart';
import 'catalogue_models.dart';
import 'category_catalogue_screen.dart';
import 'package:flutter/foundation.dart';

class WholesalerCatalogueScreen extends ConsumerStatefulWidget {
  final String wholesalerId;
  final String wholesalerName;
  final String? profileImageUrl;
  final String? profileImageCacheKey;

  const WholesalerCatalogueScreen({
    super.key,
    required this.wholesalerId,
    required this.wholesalerName,
    this.profileImageUrl,
    this.profileImageCacheKey,
  });

  @override
  ConsumerState<WholesalerCatalogueScreen> createState() => _WholesalerCatalogueScreenState();
}

class _WholesalerCatalogueScreenState extends ConsumerState<WholesalerCatalogueScreen> {
  late Future<_CatalogueData> _future;
  late Future<_DiscoveryData> _discoveryFuture;

  static const int _maxDiscoveryItems = 10;

  @override
  void initState() {
    super.initState();
    if (!kReleaseMode) {
      debugPrint(
        '🧭 [WholesalerCatalogueScreen] init wholesalerId=${widget.wholesalerId} name=${widget.wholesalerName}',
      );
    }
    _future = _load();
    _discoveryFuture = _future.then((d) => _loadDiscovery(d.products));
    Future.microtask(() {
      ref.read(selectedWholesalerIdProvider.notifier).state = widget.wholesalerId;
      ref.read(cartProvider.notifier).loadCart(widget.wholesalerId);
    });
  }

  Future<_CatalogueData> _load() async {
    final svc = ProductService();

    // Fetch enough for typical wholesaler catalog; safe for 100+ products.
    // If you need >500, we can add paging later without UI rewrite.
    final page = await svc.getProducts(
      wholesalerId: widget.wholesalerId,
      page: 0,
      size: 500,
    );

    final products = List<ProductResponseDTO>.unmodifiable(page.content);
    final categories = _buildHierarchy(products);
    return _CatalogueData(categories: categories, products: products);
  }

  List<CatalogueCategory> _buildHierarchy(List<ProductResponseDTO> products) {
    final byCategory = <String, _CatAgg>{};

    for (final p in products) {
      final cid = (p.categoryId ?? '').trim();
      final cname = (p.categoryName ?? 'Category').trim();
      if (cid.isEmpty) continue;

      final cat = byCategory.putIfAbsent(cid, () => _CatAgg(id: cid, name: cname));

      final sid = (p.subcategoryId ?? '').trim();
      final sname = (p.subcategoryName ?? 'Subcategory').trim();
      if (sid.isEmpty) {
        cat.rootProducts.add(p);
      } else {
        final sub = cat.subs.putIfAbsent(sid, () => _SubAgg(id: sid, name: sname));
        sub.products.add(p);
      }
    }

    final categories = byCategory.values.map((c) {
      final subs = c.subs.values
          .map((s) => CatalogueSubcategory(id: s.id, name: s.name, products: List.unmodifiable(s.products)))
          .toList()
        ..sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));

      final rootProducts = [...c.rootProducts];
      rootProducts.sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));

      return CatalogueCategory(
        id: c.id,
        name: c.name,
        products: List.unmodifiable(rootProducts),
        subcategories: List.unmodifiable(subs),
      );
    }).toList()
      ..sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));

    return categories;
  }

  Future<_DiscoveryData> _loadDiscovery(List<ProductResponseDTO> products) async {
    final productById = <String, ProductResponseDTO>{};
    for (final p in products) {
      productById[p.id] = p;
    }

    // Newly added → best-effort using sequenceNumber (newer products have higher sequence).
    final newlyAdded = [...products]
      ..sort((a, b) => (b.sequenceNumber ?? 0).compareTo(a.sequenceNumber ?? 0));
    final newlyAddedTop = newlyAdded.take(_maxDiscoveryItems).toList(growable: false);

    // Recently ordered + most ordered → derived from retailer's order history (best-effort, limited fetch).
    final orderSvc = OrderService();
    List<Map<String, dynamic>> orders;
    try {
      orders = await orderSvc.getRetailerOrders();
    } catch (_) {
      return _DiscoveryData(
        recentlyOrdered: const [],
        mostOrdered: const [],
        newlyAdded: newlyAddedTop,
      );
    }

    orders.sort((a, b) {
      final ad = DateTime.tryParse((a['date'] ?? '').toString()) ?? DateTime.fromMillisecondsSinceEpoch(0);
      final bd = DateTime.tryParse((b['date'] ?? '').toString()) ?? DateTime.fromMillisecondsSinceEpoch(0);
      return bd.compareTo(ad);
    });

    final seenRecent = <String>{};
    final recentOrdered = <ProductResponseDTO>[];
    final freq = <String, int>{};

    final maxOrderDetailsToScan = 12;
    var scanned = 0;

    for (final o in orders) {
      if (scanned >= maxOrderDetailsToScan) break;
      if (recentOrdered.length >= _maxDiscoveryItems && freq.length >= _maxDiscoveryItems) break;

      final orderId = (o['id'] ?? '').toString();
      if (orderId.isEmpty) continue;

      Map<String, dynamic> detail;
      try {
        detail = await orderSvc.getRetailerOrderDetail(orderId);
      } catch (_) {
        continue;
      }
      scanned++;

      final wholesaler = detail['wholesaler'] as Map<String, dynamic>?;
      final wid = (wholesaler?['id'] ?? '').toString();
      if (wid != widget.wholesalerId) continue;

      final items = (detail['orderItems'] is List) ? (detail['orderItems'] as List) : const [];
      for (final it in items) {
        final m = (it is Map) ? it.cast<String, dynamic>() : <String, dynamic>{};
        final pid = (m['productIdSnapshot'] ?? m['productId'] ?? '').toString();
        if (pid.isEmpty) continue;

        final qty = (m['qty'] as num?)?.toInt() ?? 1;
        freq[pid] = (freq[pid] ?? 0) + (qty <= 0 ? 1 : qty);

        if (seenRecent.add(pid)) {
          final p = productById[pid];
          if (p != null) {
            recentOrdered.add(p);
            if (recentOrdered.length >= _maxDiscoveryItems) break;
          }
        }
      }
    }

    final mostOrderedIds = freq.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));

    final mostOrdered = <ProductResponseDTO>[];
    for (final e in mostOrderedIds) {
      final p = productById[e.key];
      if (p == null) continue;
      mostOrdered.add(p);
      if (mostOrdered.length >= _maxDiscoveryItems) break;
    }

    return _DiscoveryData(
      recentlyOrdered: List.unmodifiable(recentOrdered),
      mostOrdered: List.unmodifiable(mostOrdered),
      newlyAdded: List.unmodifiable(newlyAddedTop),
    );
  }

  @override
  Widget build(BuildContext context) {
    final cartCount = ref.watch(cartBadgeCountProvider);
    final bottomInset = catalogueScrollBottomInset(cartCount);

    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      body: SafeArea(
        child: CatalogueGoToCartOverlay(
          child: FutureBuilder<_CatalogueData>(
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
                    'Failed to load catalogue: ${snapshot.error}',
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF525252)),
                  ),
                ),
              );
            }

            final data = snapshot.data;
            final categories = data?.categories ?? const <CatalogueCategory>[];
            final products = data?.products ?? const <ProductResponseDTO>[];
            if (categories.isEmpty) {
              return const Center(
                child: Padding(
                  padding: EdgeInsets.all(24),
                  child: Text(
                    'No categories found.',
                    style: TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF737373)),
                  ),
                ),
              );
            }

            return SingleChildScrollView(
              padding: EdgeInsets.fromLTRB(0, 8, 0, bottomInset),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  WholesalerCatalogueHeader(
                    wholesalerName: widget.wholesalerName,
                    profileImageUrl: widget.profileImageUrl,
                    profileImageCacheKey: widget.profileImageCacheKey,
                  ),
                  const Padding(
                    padding: EdgeInsets.fromLTRB(20, 4, 20, 12),
                    child: Text(
                      'Categories',
                      style: TextStyle(
                        fontWeight: FontWeight.w900,
                        fontSize: 16,
                        color: Color(0xFF171717),
                      ),
                    ),
                  ),
                  SizedBox(
                    height: 120,
                    child: ListView.separated(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      scrollDirection: Axis.horizontal,
                      physics: const BouncingScrollPhysics(),
                      itemCount: categories.length,
                      separatorBuilder: (_, __) => const SizedBox(width: 12),
                      itemBuilder: (context, i) {
                        final c = categories[i];
                        final totalProducts =
                            c.products.length + c.subcategories.fold<int>(0, (s, sc) => s + sc.products.length);
                        return SizedBox(
                          width: 160,
                          child: DiyaCard(
                            onTap: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => CategoryCatalogueScreen(
                                    wholesalerId: widget.wholesalerId,
                                    wholesalerName: widget.wholesalerName,
                                    category: c,
                                  ),
                                ),
                              );
                            },
                            padding: const EdgeInsets.all(12),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Container(
                                  width: 40,
                                  height: 40,
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFFFE7D1),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: const Icon(
                                    Icons.category_outlined,
                                    color: Color(0xFFFF7A00),
                                    size: 22,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Expanded(
                                  child: Text(
                                    c.name,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w900,
                                      color: Color(0xFF171717),
                                      fontSize: 13,
                                      height: 1.15,
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  '${c.subcategories.length} subs • $totalProducts products',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700,
                                    color: Color(0xFF737373),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 18),

                  FutureBuilder<_DiscoveryData>(
                    future: _discoveryFuture,
                    builder: (context, dSnap) {
                      if (dSnap.connectionState == ConnectionState.waiting) {
                        // Keep the page responsive; show a minimal loader just for discovery.
                        return const Padding(
                          padding: EdgeInsets.symmetric(horizontal: 16),
                          child: SizedBox(
                            height: 40,
                            child: Align(
                              alignment: Alignment.centerLeft,
                              child: SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFFFF7A00)),
                              ),
                            ),
                          ),
                        );
                      }

                      final disc = dSnap.data ?? _DiscoveryData.empty();
                      final children = <Widget>[];

                      if (disc.recentlyOrdered.isNotEmpty) {
                        children.addAll([
                          const _SectionTitle('Recently Ordered'),
                          const SizedBox(height: 10),
                          _HorizontalProducts(
                            products: disc.recentlyOrdered.take(_maxDiscoveryItems).toList(growable: false),
                          ),
                          const SizedBox(height: 18),
                        ]);
                      }

                      if (disc.mostOrdered.isNotEmpty) {
                        children.addAll([
                          const _SectionTitle('Most Ordered'),
                          const SizedBox(height: 10),
                          _HorizontalProducts(
                            products: disc.mostOrdered.take(_maxDiscoveryItems).toList(growable: false),
                          ),
                          const SizedBox(height: 18),
                        ]);
                      }

                      // Newly Added is derived locally and is always available if products exist.
                      final newly = disc.newlyAdded.isNotEmpty
                          ? disc.newlyAdded.take(_maxDiscoveryItems).toList(growable: false)
                          : products.take(_maxDiscoveryItems).toList(growable: false);

                      if (newly.isNotEmpty) {
                        children.addAll([
                          const _SectionTitle('Newly Added'),
                          const SizedBox(height: 10),
                          _HorizontalProducts(
                            products: newly,
                          ),
                        ]);
                      }

                      if (children.isEmpty) return const SizedBox.shrink();
                      return Column(crossAxisAlignment: CrossAxisAlignment.start, children: children);
                    },
                  ),
                ],
              ),
            );
          },
        ),
        ),
      ),
    );
  }
}

class _CatAgg {
  final String id;
  final String name;
  final List<ProductResponseDTO> rootProducts = [];
  final Map<String, _SubAgg> subs = {};

  _CatAgg({required this.id, required this.name});
}

class _SubAgg {
  final String id;
  final String name;
  final List<ProductResponseDTO> products = [];

  _SubAgg({required this.id, required this.name});
}

class _CatalogueData {
  final List<CatalogueCategory> categories;
  final List<ProductResponseDTO> products;

  const _CatalogueData({
    required this.categories,
    required this.products,
  });
}

class _DiscoveryData {
  final List<ProductResponseDTO> recentlyOrdered;
  final List<ProductResponseDTO> mostOrdered;
  final List<ProductResponseDTO> newlyAdded;

  const _DiscoveryData({
    required this.recentlyOrdered,
    required this.mostOrdered,
    required this.newlyAdded,
  });

  factory _DiscoveryData.empty() => const _DiscoveryData(
        recentlyOrdered: [],
        mostOrdered: [],
        newlyAdded: [],
      );
}

class _SectionTitle extends StatelessWidget {
  final String text;

  const _SectionTitle(this.text);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Text(
        text,
        style: const TextStyle(
          fontWeight: FontWeight.w900,
          fontSize: 16,
          color: Color(0xFF171717),
        ),
      ),
    );
  }
}

class _HorizontalProducts extends StatelessWidget {
  final List<ProductResponseDTO> products;

  const _HorizontalProducts({required this.products});

  @override
  Widget build(BuildContext context) {
    if (products.isEmpty) return const SizedBox.shrink();

    return SizedBox(
      height: 280,
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(),
        itemCount: products.length,
        separatorBuilder: (_, __) => const SizedBox(width: 12),
        itemBuilder: (context, i) {
          final p = products[i];
          return SizedBox(
            width: 170,
            child: ProductCard(product: p),
          );
        },
      ),
    );
  }
}
