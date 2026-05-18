import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/cart_provider.dart';

/// Wraps catalogue content with a single floating "Go to Cart" when the cart has items.
class CatalogueGoToCartOverlay extends ConsumerWidget {
  final Widget child;

  const CatalogueGoToCartOverlay({super.key, required this.child});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final count = ref.watch(cartBadgeCountProvider);

    return Stack(
      children: [
        child,
        if (count > 0)
          Positioned(
            left: 20,
            right: 20,
            bottom: 16,
            child: SafeArea(
              top: false,
              child: Material(
                elevation: 10,
                shadowColor: const Color(0x44000000),
                borderRadius: BorderRadius.circular(999),
                color: const Color(0xFFFF7A00),
                child: InkWell(
                  onTap: () => Navigator.pushNamed(context, '/cart'),
                  borderRadius: BorderRadius.circular(999),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.shopping_cart_outlined, color: Colors.white, size: 22),
                        const SizedBox(width: 10),
                        const Text(
                          'Go to Cart',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w900,
                            fontSize: 15,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.22),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text(
                            '$count',
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w900,
                              fontSize: 13,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

/// Bottom inset so list content clears the floating cart bar.
double catalogueScrollBottomInset(int cartItemCount) => cartItemCount > 0 ? 88 : 20;
