import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/ui/diya_card.dart';
import '../../widgets/ui/stat_card.dart';

class RetailerDashboard extends ConsumerWidget {
  const RetailerDashboard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // TODO: later replace with /me endpoint
    const userName = "Retailer";
    const shopName = "My Shop";

    // Mock stats like Next.js
    const totalDue = "₹12,450";
    const lastOrder = "₹3,200";

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
                      const Text(
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
                              const Text(
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
                children: const [
                  StatCard(
                    label: "Total Due",
                    value: totalDue,
                    icon: Icons.account_balance_wallet_outlined,
                    bg: Color(0xFFFEE2E2),
                    fg: Color(0xFFDC2626),
                  ),
                  StatCard(
                    label: "Last Order",
                    value: lastOrder,
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
                          onTap: () => Navigator.pushNamed(context, '/new-order'),
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

                // Mock list
                ...List.generate(2, (idx) {
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
                                "#20${4 + idx}",
                                style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w900,
                                  color: Color(0xFF737373),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          const Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  "General Store Items",
                                  style: TextStyle(
                                    fontWeight: FontWeight.w900,
                                    color: Color(0xFF171717),
                                  ),
                                ),
                                SizedBox(height: 4),
                                Text(
                                  "Today, 10:30 AM",
                                  style: TextStyle(
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
                              const Text(
                                "₹4,250",
                                style: TextStyle(
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
                                child: const Text(
                                  "Requested",
                                  style: TextStyle(
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
