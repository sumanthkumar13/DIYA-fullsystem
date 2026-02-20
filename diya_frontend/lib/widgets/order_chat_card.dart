import 'package:flutter/material.dart';
import 'ui/diya_card.dart';

class OrderChatCard extends StatelessWidget {
  final String wholesalerName;
  final String orderNumber;
  final DateTime? lastActivityAt;
  final String status;
  final double amount;
  final int itemsCount;
  final String paymentStatus;
  final VoidCallback? onTap;

  const OrderChatCard({
    super.key,
    required this.wholesalerName,
    required this.orderNumber,
    required this.lastActivityAt,
    required this.status,
    required this.amount,
    required this.itemsCount,
    required this.paymentStatus,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final timeLabel = _formatRelativeTime(lastActivityAt);
    final pill = _statusPill(status);

    return DiyaCard(
      onTap: onTap,
      padding: const EdgeInsets.all(14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: const Color(0xFFFF7A00).withOpacity(0.10),
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Center(
              child: Icon(
                Icons.receipt_long,
                color: Color(0xFFFF7A00),
                size: 22,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        wholesalerName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontWeight: FontWeight.w900,
                          fontSize: 15,
                          color: Color(0xFF171717),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Text(
                      timeLabel,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF737373),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  orderNumber,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF737373),
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Expanded(
                      child: Text(
                        "$itemsCount items • Payment: $paymentStatus",
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF404040),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Text(
                      "₹${amount.toStringAsFixed(0)}",
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF171717),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    pill,
                    const Spacer(),
                    const Icon(
                      Icons.chevron_right,
                      size: 20,
                      color: Color(0xFFA3A3A3),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _formatRelativeTime(DateTime? dt) {
    if (dt == null) return "";

    final now = DateTime.now();
    final diff = now.difference(dt);

    if (diff.inMinutes < 1) return "Now";
    if (diff.inMinutes < 60) return "${diff.inMinutes}m";
    if (diff.inHours < 24 && now.day == dt.day) return "${diff.inHours}h";

    final yesterday = now.subtract(const Duration(days: 1));
    if (yesterday.year == dt.year && yesterday.month == dt.month && yesterday.day == dt.day) {
      return "Yesterday";
    }

    if (now.year == dt.year && now.month == dt.month && now.day == dt.day) {
      return "Today";
    }

    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec"
    ];
    return "${dt.day} ${months[dt.month - 1]}";
  }

  Widget _statusPill(String status) {
    final s = status.toUpperCase();

    final bg = switch (s) {
      "PLACED" => const Color(0xFFFFE7D1),
      "ACCEPTED" || "PACKING" || "DISPATCHED" => const Color(0xFFE0F2FE),
      "DELIVERED" || "COMPLETED" => const Color(0xFFDCFCE7),
      "REJECTED" || "CANCELLED" => const Color(0xFFFEE2E2),
      _ => const Color(0xFFF5F5F5),
    };

    final fg = switch (s) {
      "PLACED" => const Color(0xFFFF7A00),
      "ACCEPTED" || "PACKING" || "DISPATCHED" => const Color(0xFF0369A1),
      "DELIVERED" || "COMPLETED" => const Color(0xFF16A34A),
      "REJECTED" || "CANCELLED" => const Color(0xFFDC2626),
      _ => const Color(0xFF404040),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        s,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w900,
          color: fg,
        ),
      ),
    );
  }
}
