import 'package:flutter/material.dart';
import '../../models/products/product_dto.dart';
import '../ui/diya_button.dart';
import '../ui/diya_card.dart';

class ProductCard extends StatelessWidget {
  final ProductResponseDTO product;
  final VoidCallback onAdd;

  const ProductCard({
    super.key,
    required this.product,
    required this.onAdd,
  });

  @override
  Widget build(BuildContext context) {
    final imageUrl = (product.imageUrl ?? '').trim();

    return DiyaCard(
      padding: const EdgeInsets.all(10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AspectRatio(
            aspectRatio: 1, // square image area, responsive
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
          DiyaButton(
            text: 'Add',
            onPressed: onAdd,
            variant: DiyaButtonVariant.secondary,
            size: DiyaButtonSize.sm,
            fullWidth: true,
          ),
        ],
      ),
    );
  }
}

