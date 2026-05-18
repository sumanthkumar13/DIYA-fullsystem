import 'package:flutter/material.dart';
import '../../models/connections/connection_response_dto.dart';
import '../../utils/wholesaler_display.dart';
import '../../widgets/ui/diya_card.dart';
import 'wholesaler_avatar.dart';

/// List card for connected wholesalers — shop name, location, phone only.
class WholesalerSummaryCard extends StatelessWidget {
  final ConnectionResponseDTO wholesaler;
  final VoidCallback? onTap;

  const WholesalerSummaryCard({
    super.key,
    required this.wholesaler,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final name = wholesaler.displayName;
    final location = wholesaler.displayLocation;
    final phone = wholesaler.displayPhone;

    return DiyaCard(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
      onTap: onTap,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          WholesalerAvatar(
            key: ValueKey(wholesaler.profileImageCacheToken),
            name: name,
            imageUrl: wholesaler.profileImageUrl,
            cacheKey: wholesaler.profileImageCacheToken,
            size: 52,
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: const TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF171717),
                    height: 1.25,
                  ),
                ),
                if (location.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  _InfoRow(
                    icon: Icons.location_on_outlined,
                    text: location,
                  ),
                ],
                if (phone.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  _InfoRow(
                    icon: Icons.phone_outlined,
                    text: phone,
                  ),
                ],
              ],
            ),
          ),
          const Padding(
            padding: EdgeInsets.only(left: 8, top: 14),
            child: Icon(
              Icons.chevron_right_rounded,
              color: Color(0xFFD4D4D4),
              size: 26,
            ),
          ),
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String text;

  const _InfoRow({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 16, color: const Color(0xFFA3A3A3)),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            text,
            style: const TextStyle(
              fontSize: 13.5,
              fontWeight: FontWeight.w600,
              color: Color(0xFF737373),
              height: 1.35,
            ),
          ),
        ),
      ],
    );
  }
}
