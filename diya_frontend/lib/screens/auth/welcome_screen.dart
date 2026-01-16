import 'dart:ui';
import 'package:flutter/material.dart';

class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.sizeOf(context);

    // max-w-md (Tailwind) ≈ 448px, but we can clamp it for tablets too
    final maxWidth = size.width > 500 ? 420.0 : double.infinity;

    return Scaffold(
      backgroundColor: Colors.white,
      body: Center(
        child: Container(
          constraints: BoxConstraints(maxWidth: maxWidth),
          decoration: BoxDecoration(
            color: Colors.white,
            boxShadow: [
              // shadow-2xl approximation
              BoxShadow(
                color: Colors.black.withOpacity(0.15),
                blurRadius: 40,
                offset: const Offset(0, 20),
              ),
            ],
          ),
          child: SafeArea(
            child: Column(
              children: [
                // Top Section
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 32),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const SizedBox(height: 12),

                        // Illustration block
                        SizedBox(
                          width: double.infinity,
                          child: AspectRatio(
                            aspectRatio: 1,
                            child: Stack(
                              alignment: Alignment.center,
                              children: [
                                // blurred secondary circle
                                Positioned.fill(
                                  child: Center(
                                    child: Container(
                                      width: 280,
                                      height: 280,
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFFFE7D1) // secondary
                                            .withOpacity(0.5),
                                        shape: BoxShape.circle,
                                      ),
                                    ),
                                  ),
                                ),
                                Positioned.fill(
                                  child: BackdropFilter(
                                    filter: ImageFilter.blur(sigmaX: 30, sigmaY: 30),
                                    child: const SizedBox.expand(),
                                  ),
                                ),

                                // icon cards grid
                                const _WelcomeIconGrid(),
                              ],
                            ),
                          ),
                        ),

                        const SizedBox(height: 28),

                        // Title
                        RichText(
                          textAlign: TextAlign.center,
                          text: const TextSpan(
                            style: TextStyle(
                              fontSize: 30,
                              height: 1.2,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF171717), // neutral-900
                            ),
                            children: [
                              TextSpan(text: "Grow Your Business\n"),
                              TextSpan(
                                text: "With Diya",
                                style: TextStyle(
                                  color: Color(0xFFFF7A00), // primary orange
                                ),
                              ),
                            ],
                          ),
                        ),

                        const SizedBox(height: 16),

                        // Description
                        const Text(
                          "The easiest way for retailers to order stock, manage payments, and connect with top wholesalers.",
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 16,
                            height: 1.5,
                            color: Color(0xFF737373), // neutral-500
                          ),
                        ),
                        const SizedBox(height: 28),
                      ],
                    ),
                  ),
                ),

                // Bottom buttons
                Padding(
                  padding: const EdgeInsets.fromLTRB(32, 24, 32, 36),
                  child: Column(
                    children: [
                      SizedBox(
                        width: double.infinity,
                        height: 56,
                        child: ElevatedButton(
                          onPressed: () => Navigator.pushNamed(context, '/login'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFFFF7A00),
                            foregroundColor: Colors.white,
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          child: const Text(
                            "Login",
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        height: 56,
                        child: OutlinedButton(
                          onPressed: () => Navigator.pushNamed(context, '/signup'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: const Color(0xFF171717),
                            side: BorderSide(
                              color: Colors.black.withOpacity(0.10), // --button-outline
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          child: const Text(
                            "Create Account",
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _WelcomeIconGrid extends StatelessWidget {
  const _WelcomeIconGrid();

  @override
  Widget build(BuildContext context) {
    // Card base style
    BoxDecoration cardDecoration() {
      return BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16), // rounded-2xl
        border: Border.all(color: const Color(0xFFF5F5F5)), // neutral-100
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.12),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      );
    }

    Widget skeletonLine(double width) => Container(
          height: 8,
          width: width,
          decoration: BoxDecoration(
            color: const Color(0xFFF5F5F5),
            borderRadius: BorderRadius.circular(999),
          ),
        );

    Widget iconCard({
      required IconData icon,
      required Color iconColor,
      required Widget transform,
    }) {
      final content = Container(
        padding: const EdgeInsets.all(24),
        decoration: cardDecoration(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 32, color: iconColor),
            const SizedBox(height: 10),
            skeletonLine(64),
            const SizedBox(height: 6),
            skeletonLine(40),
          ],
        ),
      );
      // return transform is Transform ? transform.copyWith(child: content) : content;
      return content;
    }

    return LayoutBuilder(
      builder: (context, c) {
        final w = c.maxWidth;

        return Center(
          child: SizedBox(
            width: w > 320 ? 280 : w,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Top row 2 cards
                Row(
                  children: [
                    Expanded(
                      child: Transform.rotate(
                        angle: -0.10,
                        child: Container(
                          padding: const EdgeInsets.all(24),
                          decoration: cardDecoration(),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Icon(Icons.shopping_bag, size: 32, color: Color(0xFFFF7A00)),
                              const SizedBox(height: 10),
                              skeletonLine(64),
                              const SizedBox(height: 6),
                              skeletonLine(40),
                            ],
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Transform.translate(
                        offset: const Offset(0, 32),
                        child: Transform.rotate(
                          angle: 0.05,
                          child: Container(
                            padding: const EdgeInsets.all(24),
                            decoration: cardDecoration(),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Icon(Icons.trending_up, size: 32, color: Color(0xFF22C55E)),
                                const SizedBox(height: 10),
                                skeletonLine(64),
                                const SizedBox(height: 6),
                                skeletonLine(40),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 18),

                // Bottom centered card (2/3 width)
                Align(
                  alignment: Alignment.center,
                  child: SizedBox(
                    width: 190,
                    child: Transform.rotate(
                      angle: 0.05,
                      child: Container(
                        padding: const EdgeInsets.all(24),
                        decoration: cardDecoration(),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Icon(Icons.people_alt, size: 32, color: Color(0xFF3B82F6)),
                            const SizedBox(height: 10),
                            skeletonLine(64),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
