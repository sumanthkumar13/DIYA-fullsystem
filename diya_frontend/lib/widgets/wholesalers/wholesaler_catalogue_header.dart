import 'package:flutter/material.dart';
import 'wholesaler_avatar.dart';

/// Catalogue top bar: back, avatar, and "Welcome, {shop name}".
class WholesalerCatalogueHeader extends StatelessWidget {
  final String wholesalerName;
  final String? profileImageUrl;
  final String? profileImageCacheKey;
  final VoidCallback? onBack;

  const WholesalerCatalogueHeader({
    super.key,
    required this.wholesalerName,
    this.profileImageUrl,
    this.profileImageCacheKey,
    this.onBack,
  });

  @override
  Widget build(BuildContext context) {
    final name = wholesalerName.trim().isEmpty ? 'Wholesaler' : wholesalerName.trim();

    return Padding(
      padding: const EdgeInsets.fromLTRB(4, 8, 20, 20),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          IconButton(
            onPressed: onBack ?? () => Navigator.maybePop(context),
            icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
            color: const Color(0xFF171717),
            tooltip: 'Back',
          ),
          WholesalerAvatar(
            key: ValueKey(profileImageCacheKey ?? profileImageUrl ?? name),
            name: name,
            imageUrl: profileImageUrl,
            cacheKey: profileImageCacheKey ?? profileImageUrl,
            size: 52,
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Welcome,',
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                    color: Color(0xFF737373),
                    height: 1.2,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  name,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontWeight: FontWeight.w900,
                    fontSize: 20,
                    color: Color(0xFF171717),
                    height: 1.2,
                    letterSpacing: -0.3,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
