import 'package:flutter/material.dart';
import '../../widgets/order_chat_card.dart';
import '../../services/order_service.dart';
import 'order_detail_screen.dart';

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  String activeTab = "all";

  late Future<List<_UiOrder>> _ordersFuture;

  @override
  void initState() {
    super.initState();
    _ordersFuture = _loadOrders();
  }

  Future<void> _refresh() async {
    setState(() {
      _ordersFuture = _loadOrders();
    });
    await _ordersFuture;
  }

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

  List<_UiOrder> _filterByTab(List<_UiOrder> orders) {
    if (activeTab == "all") return orders;

    if (activeTab == "requested") {
      return orders.where((o) => o.status.toUpperCase() == "PLACED").toList();
    }
    if (activeTab == "delivered") {
      return orders.where((o) {
        final s = o.status.toUpperCase();
        return s == "DELIVERED" || s == "COMPLETED";
      }).toList();
    }

    return orders;
  }

  Future<List<_UiOrder>> _loadOrders() async {
    final svc = OrderService();
    final list = await svc.getRetailerOrders();

    final futures = list.map((li) async {
      final orderId = (li["id"] ?? "").toString();
      final status = (li["status"] ?? "PLACED").toString();
      final amount = (li["amount"] as num? ?? 0).toDouble();
      final itemsCount = (li["items"] as num? ?? 0).toInt();

      DateTime? placedAt;
      final dateStr = (li["date"] ?? "").toString();
      if (dateStr.isNotEmpty) {
        placedAt = DateTime.tryParse(dateStr);
      }

      String wholesalerName = "Wholesaler";
      String orderNumber = "";
      String paymentStatus = "UNPAID";

      try {
        final detail = await svc.getRetailerOrderDetail(orderId);

        final wholesaler = detail["wholesaler"] as Map<String, dynamic>?;
        wholesalerName = (wholesaler?["businessName"] ?? wholesalerName).toString();

        orderNumber = (detail["orderNumber"] ?? "").toString();
        paymentStatus = (detail["paymentStatus"] ?? paymentStatus).toString();

        final placedAtStr = (detail["placedAt"] ?? "").toString();
        final parsedPlacedAt = DateTime.tryParse(placedAtStr);
        if (parsedPlacedAt != null) placedAt = parsedPlacedAt;
      } catch (_) {
        orderNumber = orderId;
      }

      final displayOrderNumber = orderNumber.isEmpty ? orderId : orderNumber;

      return _UiOrder(
        id: orderId,
        wholesalerName: wholesalerName,
        orderNumber: displayOrderNumber,
        placedAt: placedAt,
        status: status,
        amount: amount,
        itemsCount: itemsCount,
        paymentStatus: paymentStatus,
      );
    }).toList();

    final orders = await Future.wait(futures);
    orders.sort((a, b) {
      final ad = a.placedAt ?? DateTime.fromMillisecondsSinceEpoch(0);
      final bd = b.placedAt ?? DateTime.fromMillisecondsSinceEpoch(0);
      return bd.compareTo(ad);
    });
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

        Expanded(
          child: RefreshIndicator(
            onRefresh: _refresh,
            color: const Color(0xFFFF7A00),
            child: FutureBuilder<List<_UiOrder>>(
              future: _ordersFuture,
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return ListView(
                    children: List.generate(
                      3,
                      (i) => Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: Container(
                          height: 96,
                          decoration: BoxDecoration(
                            color: const Color(0xFFFFFFFF),
                            borderRadius: BorderRadius.circular(16),
                          ),
                        ),
                      ),
                    ),
                  );
                }

                final orders = snapshot.data ?? [];
                final filtered = _filterByTab(orders);

                if (filtered.isEmpty) {
                  return ListView(
                    children: const [
                      SizedBox(height: 60),
                      _EmptyOrders(),
                    ],
                  );
                }

                return ListView.builder(
                  itemCount: filtered.length,
                  itemBuilder: (context, index) {
                    final o = filtered[index];

                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: OrderChatCard(
                        wholesalerName: o.wholesalerName,
                        orderNumber: o.orderNumber,
                        lastActivityAt: o.placedAt,
                        status: o.status,
                        amount: o.amount,
                        itemsCount: o.itemsCount,
                        paymentStatus: o.paymentStatus,
                        onTap: () async {
                          await Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => OrderDetailScreen(orderId: o.id),
                            ),
                          );
                          if (!mounted) return;
                          await _refresh();
                        },
                      ),
                    );
                  },
                );
              },
            ),
          ),
        ),
      ],
    );
  }
}

class _UiOrder {
  final String id;
  final String wholesalerName;
  final String orderNumber;
  final DateTime? placedAt;
  final String status;
  final double amount;
  final int itemsCount;
  final String paymentStatus;

  const _UiOrder({
    required this.id,
    required this.wholesalerName,
    required this.orderNumber,
    required this.placedAt,
    required this.status,
    required this.amount,
    required this.itemsCount,
    required this.paymentStatus,
  });
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
