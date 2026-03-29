import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/retailer_session_provider.dart';
import '../../widgets/ui/diya_card.dart';
import '../../widgets/ui/stat_card.dart';
import '../../widgets/wholesaler_picker_sheet.dart';

class RetailerDashboard extends ConsumerWidget {
  const RetailerDashboard({super.key});

  String _fmtInr(num value) => "₹${value.toStringAsFixed(0)}";

  String _fmtDateTime(DateTime? dt) {
    if (dt == null) return "";
    final h = dt.hour % 12 == 0 ? 12 : dt.hour % 12;
    final mm = dt.minute.toString().padLeft(2, '0');
    final ampm = dt.hour >= 12 ? "PM" : "AM";
    return "${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year} • $h:$mm $ampm";
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sessionAsync = ref.watch(retailerSessionProvider);
    final session = sessionAsync.valueOrNull;

    final shopName = (session?.profile['shopName'] ?? "My Shop").toString();
    final userName = shopName.isNotEmpty ? shopName : "Retailer";

    final totalDue = _fmtInr(session?.totalDue ?? 0);
    final lastOrder = session?.lastOrder;
    final lastOrderAmt = _fmtInr(
      (lastOrder?['amount'] is num)
          ? (lastOrder?['amount'] as num)
          : num.tryParse((lastOrder?['amount'] ?? '0').toString()) ?? 0,
    );
    final recentOrders = session?.recentOrders ?? const <Map<String, dynamic>>[];

    // ✅ IMPORTANT:
    // This screen must NOT return Scaffold.
    // RetailerShell is the scaffold + navbar holder.

    return CustomScrollView(
      slivers: [
        // HEADER (orange) - reduced size
        SliverToBoxAdapter(
          child: Container(
            padding: const EdgeInsets.fromLTRB(20, 14, 20, 18),
            decoration: const BoxDecoration(
              color: Color(0xFFFF7A00),
              borderRadius: BorderRadius.only(
                bottomLeft: Radius.circular(26),
                bottomRight: Radius.circular(26),
              ),
              boxShadow: [
                BoxShadow(
                  color: Color(0x33000000),
                  blurRadius: 18,
                  offset: Offset(0, 8),
                )
              ],
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Left
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "Welcome back,",
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: Colors.white.withOpacity(0.82),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        userName,
                        style: TextStyle(
                          fontSize: 18, // ✅ smaller than 22
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 8),
                      GestureDetector(
                        onTap: () => Navigator.pushNamed(context, '/account'),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.20),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                width: 7,
                                height: 7,
                                decoration: const BoxDecoration(
                                  color: Color(0xFF4ADE80),
                                  shape: BoxShape.circle,
                                ),
                              ),
                              const SizedBox(width: 6),
                              Text(
                                shopName,
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  color: Colors.white,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                // Bell
                Container(
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.10),
                    shape: BoxShape.circle,
                  ),
                  child: IconButton(
                    icon: const Icon(Icons.notifications_none, color: Colors.white),
                    onPressed: () {
                      // TODO: Notifications screen later
                    },
                  ),
                ),
              ],
            ),
          ),
        ),

        // Stats grid overlap (slightly reduced overlap so it won't hide)
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 0),
          sliver: SliverToBoxAdapter(
            child: Transform.translate(
              offset: const Offset(0, -18), // ✅ was -28
              child: GridView.count(
                crossAxisCount: 2,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                children: [
                  StatCard(
                    label: "Total Due",
                    value: totalDue,
                    icon: Icons.account_balance_wallet_outlined,
                    bg: Color(0xFFFEE2E2),
                    fg: Color(0xFFDC2626),
                  ),
                  StatCard(
                    label: "Last Order",
                    value: lastOrderAmt,
                    icon: Icons.shopping_bag_outlined,
                    bg: Color(0xFFDBEAFE),
                    fg: Color(0xFF2563EB),
                  ),
                ],
              ),
            ),
          ),
        ),

        // BODY
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 20),
          sliver: SliverList(
            delegate: SliverChildListDelegate(
              [
                const SizedBox(height: 6),

                // Quick actions
                const Text(
                  "Quick Actions",
                  style: TextStyle(
                    fontSize: 16, // ✅ slightly smaller
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF262626),
                  ),
                ),
                const SizedBox(height: 12),

                SizedBox(
                  height: 160,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    children: [
                      SizedBox(
                        width: 160,
                        child: DiyaCard(
                          onTap: () => openWholesalerPickerAndProceed(context, ref),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Container(
                                width: 44,
                                height: 44,
                                decoration: const BoxDecoration(
                                  color: Color(0xFFFF7A00),
                                  shape: BoxShape.circle,
                                  boxShadow: [
                                    BoxShadow(
                                      color: Color(0x4DFF7A00),
                                      blurRadius: 18,
                                      offset: Offset(0, 10),
                                    )
                                  ],
                                ),
                                child: const Icon(Icons.add, color: Colors.white, size: 26),
                              ),
                              const SizedBox(height: 10),
                              const Text(
                                "New Order",
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w900,
                                  color: Color(0xFFFF7A00),
                                ),
                              )
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      SizedBox(
                        width: 160,
                        child: DiyaCard(
                          onTap: () => Navigator.pushNamed(context, '/payments'),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: const [
                              _RoundIcon(
                                bg: Color(0xFFDBEAFE),
                                fg: Color(0xFF2563EB),
                                icon: Icons.account_balance_wallet_outlined,
                              ),
                              SizedBox(height: 10),
                              Text(
                                "Pay Bill",
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w700,
                                  color: Color(0xFF404040),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      SizedBox(
                        width: 160,
                        child: DiyaCard(
                          onTap: () => Navigator.pushNamed(context, '/connect'),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: const [
                              _RoundIcon(
                                bg: Color(0xFFF3E8FF),
                                fg: Color(0xFF9333EA),
                                icon: Icons.storefront,
                              ),
                              SizedBox(height: 10),
                              Text(
                                "Search Wholesalers",
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w700,
                                  color: Color(0xFF404040),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      SizedBox(
                        width: 160,
                        child: DiyaCard(
                          onTap: () => Navigator.pushNamed(context, '/wholesalers'),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: const [
                              _RoundIcon(
                                bg: Color(0xFFE0F2FE),
                                fg: Color(0xFF0284C7),
                                icon: Icons.store,
                              ),
                              SizedBox(height: 10),
                              Text(
                                "My Wholesalers",
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w700,
                                  color: Color(0xFF404040),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 22),

                // Recent orders
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      "Recent Orders",
                      style: TextStyle(
                        fontSize: 16, // ✅ smaller
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF262626),
                      ),
                    ),
                    TextButton(
                      onPressed: () => Navigator.pushNamed(context, '/orders'),
                      child: const Text(
                        "View All",
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFFFF7A00),
                        ),
                      ),
                    )
                  ],
                ),
                const SizedBox(height: 10),

                if (sessionAsync.isLoading)
                  const Padding(
                    padding: EdgeInsets.only(top: 12),
                    child: Center(
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Color(0xFFFF7A00),
                      ),
                    ),
                  )
                else if (sessionAsync.hasError)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: DiyaCard(
                      child: Row(
                        children: [
                          const Icon(Icons.error_outline, color: Color(0xFFDC2626)),
                          const SizedBox(width: 10),
                          const Expanded(
                            child: Text(
                              "Couldn't load dashboard data. Pull to refresh later.",
                              style: TextStyle(fontWeight: FontWeight.w700),
                            ),
                          ),
                          TextButton(
                            onPressed: () => ref.read(retailerSessionProvider.notifier).sync(),
                            child: const Text(
                              "Retry",
                              style: TextStyle(
                                fontWeight: FontWeight.w900,
                                color: Color(0xFFFF7A00),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  )
                else if (recentOrders.isEmpty)
                  const Padding(
                    padding: EdgeInsets.only(top: 8),
                    child: Text(
                      "No recent orders yet.",
                      style: TextStyle(
                        fontSize: 13,
                        color: Color(0xFF737373),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  )
                else
                  ...recentOrders.map((o) {
                    final orderNumber = (o['orderNumber'] ?? o['id'] ?? '').toString();
                    final amount = (o['amount'] is num)
                        ? (o['amount'] as num)
                        : num.tryParse((o['amount'] ?? '0').toString()) ?? 0;
                    final status = (o['status'] ?? '').toString();
                    final placedAt = DateTime.tryParse((o['date'] ?? '').toString()) ??
                        DateTime.tryParse((o['placedAt'] ?? '').toString());

                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: DiyaCard(
                        onTap: () => Navigator.pushNamed(context, '/orders'),
                        child: Row(
                          children: [
                            Container(
                              width: 48,
                              height: 48,
                              decoration: BoxDecoration(
                                color: const Color(0xFFF5F5F5),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Center(
                                child: Text(
                                  orderNumber.isEmpty ? "#" : "#$orderNumber",
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w900,
                                    color: Color(0xFF737373),
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
                                    "Order $orderNumber",
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w900,
                                      color: Color(0xFF171717),
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    _fmtDateTime(placedAt),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      fontSize: 12,
                                      color: Color(0xFF737373),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text(
                                  _fmtInr(amount),
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w900,
                                    color: Color(0xFF171717),
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFFEF3C7),
                                    borderRadius: BorderRadius.circular(999),
                                  ),
                                  child: Text(
                                    status.isEmpty ? "Placed" : status,
                                    style: const TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w800,
                                      color: Color(0xFFB45309),
                                    ),
                                  ),
                                ),
                              ],
                            )
                          ],
                        ),
                      ),
                    );
                  }),

                const SizedBox(height: 10),

                // ✅ Logout removed from home (should be in Account screen)
                // keep home clean for daily usage
              ],
            ),
          ),
        )
      ],
    );
  }
}

class _RoundIcon extends StatelessWidget {
  final Color bg;
  final Color fg;
  final IconData icon;

  const _RoundIcon({required this.bg, required this.fg, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(color: bg, shape: BoxShape.circle),
      child: Icon(icon, color: fg, size: 20),
    );
  }
}
