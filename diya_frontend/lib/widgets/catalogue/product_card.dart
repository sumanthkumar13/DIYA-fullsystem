import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../models/products/product_dto.dart';
import '../../providers/cart_provider.dart';
import '../ui/diya_button.dart';
import '../ui/diya_card.dart';
import 'cart_qty_control.dart';

class ProductCard extends ConsumerWidget {
  final ProductResponseDTO product;

  const ProductCard({
    super.key,
    required this.product,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final imageUrl = (product.imageUrl ?? '').trim();
    final qty = ref.watch(cartQuantityProvider(product.id));

    return DiyaCard(
      padding: const EdgeInsets.all(10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AspectRatio(
            aspectRatio: 1,
            child: Container(
              width: double.infinity,
              decoration: BoxDecoration(
                color: const Color(0xFFF5F5F5),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE5E5E5)),
              ),
              clipBehavior: Clip.antiAlias,
              child: imageUrl.isEmpty
                  ? const Center(
                      child: Text(
                        'No Image',
                        style: TextStyle(
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF737373),
                          fontSize: 12,
                        ),
                      ),
                    )
                  : Image.network(
                      imageUrl,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => const Center(
                        child: Text(
                          'No Image',
                          style: TextStyle(
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF737373),
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            product.name,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontWeight: FontWeight.w900,
              color: Color(0xFF171717),
              fontSize: 12.5,
              height: 1.2,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            '₹${product.price.toStringAsFixed(0)}',
            style: const TextStyle(
              fontWeight: FontWeight.w900,
              color: Color(0xFF171717),
              fontSize: 13.5,
            ),
          ),
          const Spacer(),
          if (qty > 0)
            CartQtyControl(
              quantity: qty,
              compact: true,
              onDecrement: () => ref.read(cartProvider.notifier).setQuantity(product.id, qty - 1),
              onIncrement: () => ref.read(cartProvider.notifier).setQuantity(product.id, qty + 1),
            )
          else
            DiyaButton(
              text: 'Add',
              onPressed: () => ref.read(cartProvider.notifier).addItem(product.id),
              variant: DiyaButtonVariant.secondary,
              size: DiyaButtonSize.sm,
              fullWidth: true,
            ),
        ],
      ),
    );
  }
}
