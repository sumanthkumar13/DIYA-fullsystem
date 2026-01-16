import 'package:flutter/material.dart';
import '../../widgets/ui/diya_card.dart';

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  String activeTab = "all";
  bool loading = false;

  // mock orders for UI migration (until backend wired)
  final List<Map<String, dynamic>> orders = [
    {"id": 204, "status": "requested", "totalAmount": 4250, "createdAt": DateTime.now()},
    {"id": 205, "status": "out_for_delivery", "totalAmount": 1200, "createdAt": DateTime.now()},
    {"id": 206, "status": "delivered", "totalAmount": 3200, "createdAt": DateTime.now()},
  ];

  Color _badgeBg(String variant) {
    return switch (variant) {
      "success" => const Color(0xFFDCFCE7),
      "warning" => const Color(0xFFFEF3C7),
      "danger" => const Color(0xFFFEE2E2),
      _ => const Color(0xFFF5F5F5),
    };
  }

  Color _badgeFg(String variant) {
    return switch (variant) {
      "success" => const Color(0xFF16A34A),
      "warning" => const Color(0xFFB45309),
      "danger" => const Color(0xFFDC2626),
      _ => const Color(0xFF404040),
    };
  }

  String _statusVariant(String status) {
    switch (status) {
      case 'requested':
        return 'warning';
      case 'approved':
        return 'default';
      case 'out_for_delivery':
        return 'success';
      case 'delivered':
        return 'success';
      default:
        return 'default';
    }
  }

  IconData _statusIcon(String status) {
    switch (status) {
      case 'out_for_delivery':
        return Icons.local_shipping_outlined;
      case 'delivered':
        return Icons.check_circle_outline;
      default:
        return Icons.access_time;
    }
  }

  List<Map<String, dynamic>> get filteredOrders {
    if (activeTab == "all") return orders;

    if (activeTab == "requested") {
      return orders.where((o) => (o["status"] ?? "") == "requested").toList();
    }
    if (activeTab == "delivered") {
      return orders.where((o) => (o["status"] ?? "") == "delivered").toList();
    }

    return orders;
  }

  @override
  Widget build(BuildContext context) {
    // ✅ IMPORTANT:
    // This screen must NOT return RetailerShell or Scaffold.
    // main.dart already wraps /orders with RetailerShell.

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Tabs (sticky feel)
        Container(
          margin: const EdgeInsets.only(bottom: 16),
          padding: const EdgeInsets.symmetric(vertical: 10),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _TabChip(
                  label: "All",
                  active: activeTab == "all",
                  onTap: () => setState(() => activeTab = "all"),
                ),
                _TabChip(
                  label: "Pending",
                  active: activeTab == "requested",
                  onTap: () => setState(() => activeTab = "requested"),
                ),
                _TabChip(
                  label: "Completed",
                  active: activeTab == "delivered",
                  onTap: () => setState(() => activeTab = "delivered"),
                ),
              ],
            ),
          ),
        ),

        if (loading) ...[
          ...List.generate(
            3,
            (i) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Container(
                height: 120,
                decoration: BoxDecoration(
                  color: const Color(0xFFFFFFFF),
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
            ),
          )
        ] else if (filteredOrders.isEmpty) ...[
          const SizedBox(height: 60),
          const _EmptyOrders()
        ] else ...[
          ...filteredOrders.map((order) {
            final id = order["id"];
            final status = (order["status"] ?? "requested").toString();
            final createdAt = order["createdAt"] as DateTime?;
            final total = order["totalAmount"] ?? 1200;

            final variant = _statusVariant(status);

            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: DiyaCard(
                child: Column(
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 48,
                          height: 48,
                          decoration: BoxDecoration(
                            color: const Color(0xFFFF7A00).withOpacity(0.10),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Center(
                            child: Text(
                              "#$id",
                              style: const TextStyle(
                                fontWeight: FontWeight.w900,
                                color: Color(0xFFFF7A00),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                "Order #$id",
                                style: const TextStyle(
                                  fontWeight: FontWeight.w900,
                                  color: Color(0xFF171717),
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                createdAt == null
                                    ? ""
                                    : "${createdAt.day}/${createdAt.month}/${createdAt.year}",
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: Color(0xFF737373),
                                ),
                              ),
                            ],
                          ),
                        ),

                        // Status badge
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: _badgeBg(variant),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Row(
                            children: [
                              Icon(_statusIcon(status), size: 14, color: _badgeFg(variant)),
                              const SizedBox(width: 6),
                              Text(
                                status.replaceAll("_", " "),
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w800,
                                  color: _badgeFg(variant),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 12),

                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFAFAFA),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            "Items: 3",
                            style: TextStyle(
                              color: Color(0xFF525252),
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          Text(
                            "₹$total",
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF171717),
                            ),
                          ),
                        ],
                      ),
                    )
                  ],
                ),
              ),
            );
          }),
        ],
      ],
    );
  }
}

class _TabChip extends StatelessWidget {
  final String label;
  final bool active;
  final VoidCallback onTap;

  const _TabChip({required this.label, required this.active, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 10),
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          decoration: BoxDecoration(
            color: active ? const Color(0xFF171717) : Colors.white,
            borderRadius: BorderRadius.circular(999),
            boxShadow: active
                ? const [
                    BoxShadow(
                      color: Color(0x22000000),
                      blurRadius: 10,
                      offset: Offset(0, 5),
                    ),
                  ]
                : null,
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w800,
              color: active ? Colors.white : const Color(0xFF525252),
            ),
          ),
        ),
      ),
    );
  }
}

class _EmptyOrders extends StatelessWidget {
  const _EmptyOrders();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: const [
        Icon(Icons.inventory_2_outlined, size: 62, color: Color(0xFFA3A3A3)),
        SizedBox(height: 12),
        Text(
          "No orders found",
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Color(0xFF171717)),
        ),
        SizedBox(height: 8),
        Text(
          "You haven't placed any orders in this category yet.",
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 13, color: Color(0xFF737373)),
        ),
      ],
    );
  }
}
