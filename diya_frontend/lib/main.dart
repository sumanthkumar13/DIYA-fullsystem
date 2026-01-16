import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'screens/splash/splash_screen.dart';
import 'screens/auth/welcome_screen.dart';
import 'screens/auth/login_screen.dart';
import 'screens/auth/signup_screen.dart';

import 'screens/connect/connect_screen.dart';
import 'screens/home/retailer_dashboard.dart';
import 'screens/orders/orders_screen.dart';
import 'screens/payments/payments_screen.dart';
import 'screens/account/account_screen.dart';
import 'screens/new_order/new_order_screen.dart';
import 'widgets/layout/retailer_shell.dart';

void main() {
  runApp(const ProviderScope(child: DiyaApp()));
}

class DiyaApp extends StatelessWidget {
  const DiyaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Diya',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.light,
      ),

      initialRoute: '/splash',

      routes: {
        '/splash': (_) => const SplashScreen(),
        '/welcome': (_) => const WelcomeScreen(),
        '/login': (_) => const LoginScreen(),
        '/signup': (_) => const SignupScreen(),

        '/connect': (_) => RetailerShell(
              current: NavTab.home,
              title: null,
              hideNav: true,
              // isScrollable: false,
              // padding: EdgeInsets.zero,
              child: const ConnectScreen(),
            ),

        '/home': (_) => RetailerShell(
      current: NavTab.home,
      title: null, // ✅ because dashboard already has orange header
      child: const RetailerDashboard(),
    ),

        '/orders': (_) => RetailerShell(
              current: NavTab.orders,
              title: "Orders",
              child: const OrdersScreen(),
            ),
        '/payments': (_) => RetailerShell(
              current: NavTab.payments,
              title: "Payments",
              child: const PaymentsScreen(),
            ),
        '/account': (_) => RetailerShell(
      current: NavTab.account,
      title: "My Account",
      child: const AccountScreen(),
    ),


        // placeholder route (FAB)
        '/new-order': (_) => const NewOrderScreen(),

      },
    );
  }
}

class _NewOrderPlaceholder extends StatelessWidget {
  const _NewOrderPlaceholder();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: Text(
          "New Order Screen (Coming Soon)",
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
        ),
      ),
    );
  }
}
