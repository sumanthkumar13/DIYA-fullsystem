import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/approved_wholesalers_provider.dart';
import '../catalogue/wholesaler_catalogue_screen.dart';
import '../../widgets/ui/diya_card.dart';
import '../../widgets/ui/diya_button.dart';
import 'package:flutter/foundation.dart';

class ConnectedWholesalersScreen extends ConsumerStatefulWidget {
  const ConnectedWholesalersScreen({super.key});

  @override
  ConsumerState<ConnectedWholesalersScreen> createState() =>
      _ConnectedWholesalersScreenState();
}

class _ConnectedWholesalersScreenState
    extends ConsumerState<ConnectedWholesalersScreen> {
  @override
  void initState() {
    super.initState();
    // Always refetch when this screen opens (prevents stale cross-login state).
    Future.microtask(() => ref.read(approvedWholesalersProvider.notifier).load());
  }

  @override
  Widget build(BuildContext context) {
    final wholesalersAsync = ref.watch(approvedWholesalersProvider);

    return RefreshIndicator(
      color: const Color(0xFFFF7A00),
      onRefresh: () => ref.read(approvedWholesalersProvider.notifier).load(),
      child: CustomScrollView(
        slivers: [
        // Header
        SliverToBoxAdapter(
          child: Container(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 18),
            child: const Text(
              "Wholesalers",
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.w900,
                color: Color(0xFF171717),
                letterSpacing: -0.5,
              ),
            ),
          ),
        ),

        // Content
        wholesalersAsync.when(
          data: (wholesalers) {
            if (wholesalers.isEmpty) {
              return SliverFillRemaining(
                hasScrollBody: false,
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        width: 120,
                        height: 120,
                        decoration: BoxDecoration(
                          color: const Color(0xFFFFE7D1),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.storefront_outlined,
                          size: 60,
                          color: Color(0xFFFF7A00),
                        ),
                      ),
                      const SizedBox(height: 24),
                      const Text(
                        "No Wholesalers Connected",
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF171717),
                        ),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        "Connect with wholesalers to start ordering products",
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 15,
                          color: Color(0xFF737373),
                        ),
                      ),
                      const SizedBox(height: 32),
                      DiyaButton(
                        text: "Find Wholesalers",
                        onPressed: () {
                          Navigator.pushNamed(context, '/connect');
                        },
                        variant: DiyaButtonVariant.primary,
                        fullWidth: true,
                      ),
                    ],
                  ),
                ),
              );
            }

            return SliverPadding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
              sliver: SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    final wholesaler = wholesalers[index];
                    return Padding(
                      padding: EdgeInsets.only(bottom: index == wholesalers.length - 1 ? 0 : 12),
                      child: DiyaCard(
                        padding: const EdgeInsets.all(16),
                        onTap: () {
                          if (!kReleaseMode) {
                            debugPrint(
                              '🧭 [ConnectedWholesalersScreen] open catalogue wholesalerId=${wholesaler.wholesalerId} name=${wholesaler.wholesalerBusinessName}',
                            );
                          }
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => WholesalerCatalogueScreen(
                                wholesalerId: wholesaler.wholesalerId,
                                wholesalerName: wholesaler.wholesalerBusinessName,
                              ),
                            ),
                          );
                        },
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Container(
                                  width: 48,
                                  height: 48,
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFFFE7D1),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: const Icon(
                                    Icons.store,
                                    color: Color(0xFFFF7A00),
                                    size: 24,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        wholesaler.wholesalerBusinessName,
                                        style: const TextStyle(
                                          fontSize: 16,
                                          fontWeight: FontWeight.w800,
                                          color: Color(0xFF171717),
                                        ),
                                      ),
                                      if (wholesaler.wholesalerCity.isNotEmpty) ...[
                                        const SizedBox(height: 4),
                                        Text(
                                          wholesaler.wholesalerCity,
                                          style: const TextStyle(
                                            fontSize: 13,
                                            color: Color(0xFF737373),
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                ),
                              ],
                            ),
                            if (wholesaler.wholesalerHandle.isNotEmpty) ...[
                              const SizedBox(height: 12),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF5F5F5),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  '@${wholesaler.wholesalerHandle}',
                                  style: const TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                    color: Color(0xFF525252),
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    );
                  },
                  childCount: wholesalers.length,
                ),
              ),
            );
          },
          loading: () => const SliverFillRemaining(
            child: Center(
              child: CircularProgressIndicator(
                color: Color(0xFFFF7A00),
              ),
            ),
          ),
          error: (error, stack) => SliverFillRemaining(
            hasScrollBody: false,
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.error_outline,
                    size: 64,
                    color: Color(0xFFF04343),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    "Failed to load wholesalers",
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF171717),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    error.toString(),
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 14,
                      color: Color(0xFF737373),
                    ),
                  ),
                  const SizedBox(height: 24),
                  DiyaButton(
                    text: "Retry",
                    onPressed: () {
                      ref.read(approvedWholesalersProvider.notifier).load();
                    },
                    variant: DiyaButtonVariant.primary,
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
      ),
    );
  }
}
