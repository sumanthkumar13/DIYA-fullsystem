import 'package:flutter/material.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../providers/auth_provider.dart';

import '../../providers/retailer_session_provider.dart';



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

  String? _startupError;



  @override

  void initState() {

    super.initState();



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



    WidgetsBinding.instance.addPostFrameCallback((_) {

      _bootstrap();

    });

  }



  Future<void> _bootstrap() async {

    if (_navigated) return;

    _navigated = true;



    await Future.wait([

      Future.delayed(const Duration(seconds: 2)),

      ref.read(authProvider.notifier).waitUntilReady(),

    ]);



    if (!mounted) return;



    final status = ref.read(authProvider);

    final auth = ref.read(authProvider.notifier);



    if (status == AuthStatus.unauthenticated) {

      Navigator.pushReplacementNamed(context, '/welcome');

      return;

    }



    if (!auth.retailerProfileExists) {

      Navigator.pushReplacementNamed(context, '/signup');

      return;

    }



    final session = ref.read(retailerSessionProvider).valueOrNull;

    if (session == null) {

      setState(() {

        _navigated = false;

        _startupError = 'Could not load your shop data. Check your connection and try again.';

      });

      return;

    }



    Navigator.pushReplacementNamed(context, '/home');

  }



  Future<void> _retryStartup() async {
    setState(() => _startupError = null);
    final ok = await ref.read(retailerSessionProvider.notifier).sync();
    if (!mounted) return;
    if (ok) {
      Navigator.pushReplacementNamed(context, '/home');
      return;
    }
    setState(() {
      _startupError =
          'Could not load your shop data. Check your connection and try again.';
    });
  }



  @override

  void dispose() {

    _controller.dispose();

    super.dispose();

  }



  @override

  Widget build(BuildContext context) {

    return Scaffold(

      backgroundColor: const Color(0xFFFF7A00),

      body: SafeArea(

        child: Center(

          child: Padding(

            padding: const EdgeInsets.symmetric(horizontal: 28),

            child: _startupError != null

                ? Column(

                    mainAxisSize: MainAxisSize.min,

                    children: [

                      const Icon(Icons.wifi_off_rounded, color: Colors.white, size: 40),

                      const SizedBox(height: 16),

                      Text(

                        _startupError!,

                        textAlign: TextAlign.center,

                        style: const TextStyle(

                          color: Colors.white,

                          fontWeight: FontWeight.w600,

                          height: 1.4,

                        ),

                      ),

                      const SizedBox(height: 20),

                      FilledButton(

                        onPressed: _retryStartup,

                        style: FilledButton.styleFrom(

                          backgroundColor: Colors.white,

                          foregroundColor: const Color(0xFFFF7A00),

                        ),

                        child: const Text('Retry'),

                      ),

                    ],

                  )

                : FadeTransition(

                    opacity: _opacity,

                    child: ScaleTransition(

                      scale: _scale,

                      child: Column(

                        mainAxisSize: MainAxisSize.min,

                        children: [

                          Transform.rotate(

                            angle: 0.05,

                            child: Container(

                              width: 96,

                              height: 96,

                              decoration: BoxDecoration(

                                color: Colors.white,

                                borderRadius: BorderRadius.circular(24),

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

                                  'D',

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

                            'Diya',

                            style: TextStyle(

                              fontSize: 36,

                              fontWeight: FontWeight.w800,

                              letterSpacing: -0.5,

                              color: Colors.white,

                            ),

                          ),

                          const SizedBox(height: 8),

                          Text(

                            'Connecting Retailers & Wholesalers',

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

      ),

    );

  }

}


