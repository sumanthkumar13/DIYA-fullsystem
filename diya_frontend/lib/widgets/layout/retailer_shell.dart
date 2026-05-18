import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/cart_provider.dart';
import '../../providers/retailer_session_provider.dart';


enum NavTab { home, orders, cart, payments, account }

class RetailerShell extends ConsumerWidget {
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
  Widget build(BuildContext context, WidgetRef ref) {
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
              child: Column(
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

                  // Content
                  Expanded(
                    child: Padding(
                      padding: EdgeInsets.fromLTRB(
                        16,
                        title == null ? 0 : 16,
                        16,
                        16,
                      ),
                      child: AnimatedSwitcher(
                        duration: const Duration(milliseconds: 200),
                        child: child,
                      ),
                    ),
                  ),

                  if (!hideNav)
                    _RetailerNavigationBar(
                      current: current,
                      primary: _primary,
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

class _RetailerNavigationBar extends ConsumerWidget {
  final NavTab current;
  final Color primary;

  const _RetailerNavigationBar({required this.current, required this.primary});

  int _indexForTab(NavTab tab) => switch (tab) {
        NavTab.home => 0,
        NavTab.orders => 1,
        NavTab.cart => 2,
        NavTab.payments => 3,
        NavTab.account => 4,
      };

  NavTab _tabForIndex(int index) => switch (index) {
        0 => NavTab.home,
        1 => NavTab.orders,
        2 => NavTab.cart,
        3 => NavTab.payments,
        _ => NavTab.account,
      };

  void _go(BuildContext context, WidgetRef ref, NavTab tab) {
    // Refresh session in background when switching tabs (sync coalesces concurrent calls).
    if (tab != NavTab.cart && tab != current) {
      ref.read(retailerSessionProvider.notifier).sync();
    }

    final route = switch (tab) {
      NavTab.home => '/home',
      NavTab.orders => '/orders',
      NavTab.cart => '/cart',
      NavTab.payments => '/payments',
      NavTab.account => '/account',
    };

    Navigator.pushReplacementNamed(context, route);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cartCount = ref.watch(cartBadgeCountProvider);

    return SafeArea(
      top: false,
      child: Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: Color(0xFFF5F5F5))),
        ),
        child: NavigationBarTheme(
          data: NavigationBarThemeData(
            backgroundColor: Colors.white,
            surfaceTintColor: Colors.transparent,
            elevation: 0,
            shadowColor: Colors.transparent,
            height: 64,
            indicatorColor: const Color(0xFFFFF7ED),
            labelTextStyle: WidgetStateProperty.resolveWith((states) {
              if (states.contains(WidgetState.selected)) {
                return const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFFFF7A00),
                  letterSpacing: -0.2,
                );
              }
              return const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: Color(0xFFA3A3A3),
                letterSpacing: -0.2,
              );
            }),
            iconTheme: WidgetStateProperty.resolveWith((states) {
              if (states.contains(WidgetState.selected)) {
                return const IconThemeData(
                  color: Color(0xFFFF7A00),
                  size: 24,
                );
              }
              return const IconThemeData(
                color: Color(0xFFA3A3A3),
                size: 24,
              );
            }),
          ),
          child: NavigationBar(
          selectedIndex: _indexForTab(current),
          onDestinationSelected: (i) => _go(context, ref, _tabForIndex(i)),
          labelBehavior: NavigationDestinationLabelBehavior.onlyShowSelected,
          indicatorColor: const Color(0xFFFFF7ED),
          destinations: [
            const NavigationDestination(
              icon: Icon(Icons.home_filled),
              label: 'Home',
            ),
            const NavigationDestination(
              icon: Icon(Icons.shopping_bag_outlined),
              label: 'Orders',
            ),
            NavigationDestination(
              icon: _CartIcon(cartCount: cartCount),
              label: 'Cart',
            ),
            const NavigationDestination(
              icon: Icon(Icons.account_balance_wallet_outlined),
              label: 'Pay',
            ),
            const NavigationDestination(
              icon: Icon(Icons.person_outline),
              label: 'Acct',
            ),
          ],
        ),
        ),
      ),
    );
  }
}

class _CartIcon extends StatelessWidget {
  final int cartCount;
  const _CartIcon({required this.cartCount});

  @override
  Widget build(BuildContext context) {
    if (cartCount <= 0) return const Icon(Icons.shopping_cart_outlined);

    return Badge(
      backgroundColor: const Color(0xFFFF7A00),
      textColor: Colors.white,
      label: Text(
        cartCount > 99 ? '99+' : '$cartCount',
        style: const TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w900,
          color: Colors.white,
        ),
      ),
      child: const Icon(Icons.shopping_cart_outlined),
    );
  }
}
