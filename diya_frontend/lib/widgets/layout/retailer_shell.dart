import 'package:flutter/material.dart';

enum NavTab { home, orders, payments, account }

class RetailerShell extends StatelessWidget {
  final Widget child;
  final String? title;
  final bool hideNav;
  final NavTab current;

  const RetailerShell({
    super.key,
    required this.child,
    required this.current,
    this.title,
    this.hideNav = false,
  });

  Color get _primary => const Color(0xFFFF7A00);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: Container(
              decoration: const BoxDecoration(
                color: Colors.white,
                boxShadow: [
                  BoxShadow(
                    color: Color(0x33000000),
                    blurRadius: 30,
                    offset: Offset(0, 12),
                  ),
                ],
              ),
              child: Stack(
                children: [
                  Column(
                    children: [
                      // Header
                      if (title != null)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.90),
                            border: const Border(
                              bottom: BorderSide(color: Color(0xFFF5F5F5)),
                            ),
                          ),
                          child: Align(
                            alignment: Alignment.centerLeft,
                            child: Text(
                              title!,
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w900,
                                color: Color(0xFF262626),
                              ),
                            ),
                          ),
                        ),

                      // Content (NO scroll wrapper here)
                      Expanded(
                        child: Padding(
                          padding: EdgeInsets.fromLTRB(
                            16,
                            title == null ? 0 : 16,
                            16,
                            hideNav ? 16 : 96,
                          ),
                          child: AnimatedSwitcher(
                            duration: const Duration(milliseconds: 200),
                            child: child,
                          ),
                        ),
                      ),
                    ],
                  ),

                  // Bottom Nav
                  if (!hideNav)
                    Positioned(
                      left: 0,
                      right: 0,
                      bottom: 0,
                      child: _BottomNav(
                        current: current,
                        primary: _primary,
                      ),
                    ),

                  // Floating FAB
                  if (!hideNav)
                    Positioned(
                      left: 0,
                      right: 0,
                      bottom: 42,
                      child: Center(
                        child: GestureDetector(
                          onTap: () => Navigator.pushNamed(context, '/new-order'),
                          child: Container(
                            width: 56,
                            height: 56,
                            decoration: BoxDecoration(
                              color: _primary,
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(
                                  color: _primary.withOpacity(0.30),
                                  blurRadius: 22,
                                  offset: const Offset(0, 12),
                                ),
                              ],
                            ),
                            child: const Icon(Icons.add, color: Colors.white, size: 28),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _BottomNav extends StatelessWidget {
  final NavTab current;
  final Color primary;

  const _BottomNav({required this.current, required this.primary});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(24, 10, 24, 14),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Color(0xFFF5F5F5))),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          _NavItem(
            icon: Icons.home_filled,
            label: "Home",
            active: current == NavTab.home,
            primary: primary,
            onTap: () => Navigator.pushReplacementNamed(context, '/home'),
          ),
          _NavItem(
            icon: Icons.shopping_bag_outlined,
            label: "Orders",
            active: current == NavTab.orders,
            primary: primary,
            onTap: () => Navigator.pushReplacementNamed(context, '/orders'),
          ),
          const SizedBox(width: 56), // space for FAB
          _NavItem(
            icon: Icons.account_balance_wallet_outlined,
            label: "Payments",
            active: current == NavTab.payments,
            primary: primary,
            onTap: () => Navigator.pushReplacementNamed(context, '/payments'),
          ),
          _NavItem(
            icon: Icons.person_outline,
            label: "Account",
            active: current == NavTab.account,
            primary: primary,
            onTap: () => Navigator.pushReplacementNamed(context, '/account'),
          ),
        ],
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool active;
  final Color primary;
  final VoidCallback onTap;

  const _NavItem({
    required this.icon,
    required this.label,
    required this.active,
    required this.primary,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final color = active ? primary : const Color(0xFFA3A3A3);
    final weight = active ? FontWeight.w800 : FontWeight.w600;

    return GestureDetector(
      onTap: onTap,
      child: SizedBox(
        width: 52,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 24, color: color),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(fontSize: 10, fontWeight: weight, color: color),
            )
          ],
        ),
      ),
    );
  }
}
