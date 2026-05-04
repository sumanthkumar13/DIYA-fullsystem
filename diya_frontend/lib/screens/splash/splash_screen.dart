import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/auth_provider.dart';
import '../../services/auth_service.dart';

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _scale;
  late final Animation<double> _opacity;

  bool _navigated = false;
  final AuthService _authService = AuthService();

  @override
  void initState() {
    super.initState();

    // Matches framer-motion: duration 0.8s spring-ish
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );

    _scale = Tween<double>(begin: 0.8, end: 1).animate(
      CurvedAnimation(parent: _controller, curve: Curves.elasticOut),
    );

    _opacity = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOut),
    );

    _controller.forward();

    // Startup auth gate: never navigate based on token alone.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _bootstrap();
    });
  }

  Future<void> _bootstrap() async {
    if (_navigated) return;
    _navigated = true;

    await Future.delayed(const Duration(seconds: 2));

    if (!mounted) return;

    final token = await _authService.getToken();
    if (!mounted) return;

    if (token == null || token.isEmpty) {
      Navigator.pushReplacementNamed(context, '/welcome');
      return;
    }

    try {
      final res = await _authService.me();
      final ok = res['success'] == true;
      final data = (res['data'] as Map?)?.cast<String, dynamic>();
      final retailerProfileExists = data?['retailerProfileExists'] == true;

      if (!mounted) return;

      if (!ok) {
        await ref.read(authProvider.notifier).logout();
        if (!mounted) return;
        Navigator.pushReplacementNamed(context, '/welcome');
        return;
      }

      if (!retailerProfileExists) {
        // Onboarding/profile creation flow (existing route).
        Navigator.pushReplacementNamed(context, '/signup');
        return;
      }

      Navigator.pushReplacementNamed(context, '/home');
    } catch (_) {
      // 401/403 or unexpected → clear token and send to login.
      await ref.read(authProvider.notifier).logout();
      if (!mounted) return;
      Navigator.pushReplacementNamed(context, '/welcome');
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Still watch authProvider so global auth state is initialized,
    // but navigation is handled by `_bootstrap()` only.
    ref.watch(authProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFFF7A00), // primary
      body: SafeArea(
        child: Center(
          child: FadeTransition(
            opacity: _opacity,
            child: ScaleTransition(
              scale: _scale,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Transform.rotate(
                    angle: 0.05, // rotate-3 approx
                    child: Container(
                      width: 96,
                      height: 96,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(24), // rounded-3xl
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.18),
                            blurRadius: 20,
                            offset: const Offset(0, 10),
                          ),
                        ],
                      ),
                      child: const Center(
                        child: Text(
                          "D",
                          style: TextStyle(
                            fontSize: 48,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFFFF7A00),
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  const Text(
                    "Diya",
                    style: TextStyle(
                      fontSize: 36,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.5,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    "Connecting Retailers & Wholesalers",
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: Colors.white.withOpacity(0.80),
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
