import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/approved_wholesalers_provider.dart';
import '../../providers/selected_wholesaler_provider.dart';
import '../catalogue/wholesaler_catalogue_screen.dart';
import '../../widgets/ui/diya_button.dart';
import '../../widgets/wholesalers/wholesaler_summary_card.dart';
import '../../utils/wholesaler_display.dart';
import 'package:flutter/foundation.dart';

class ConnectedWholesalersScreen extends ConsumerStatefulWidget {
  const ConnectedWholesalersScreen({super.key});

  @override
  ConsumerState<ConnectedWholesalersScreen> createState() =>
      _ConnectedWholesalersScreenState();
}

class _ConnectedWholesalersScreenState
    extends ConsumerState<ConnectedWholesalersScreen> with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    Future.microtask(() => ref.read(approvedWholesalersProvider.notifier).load());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      ref.read(approvedWholesalersProvider.notifier).load(silent: true);
    }
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
              "My Wholesalers",
              style: TextStyle(
                fontSize: 26,
                fontWeight: FontWeight.w900,
                color: Color(0xFF171717),
                letterSpacing: -0.4,
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
              padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
              sliver: SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    final wholesaler = wholesalers[index];
                    return Padding(
                      padding: EdgeInsets.only(bottom: index == wholesalers.length - 1 ? 0 : 14),
                      child: WholesalerSummaryCard(
                        wholesaler: wholesaler,
                        onTap: () async {
                          if (!kReleaseMode) {
                            debugPrint(
                              '🧭 [ConnectedWholesalersScreen] open catalogue wholesalerId=${wholesaler.wholesalerId} name=${wholesaler.displayName}',
                            );
                          }
                          ref.read(selectedWholesalerIdProvider.notifier).state =
                              wholesaler.wholesalerId;
                          await Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => WholesalerCatalogueScreen(
                                wholesalerId: wholesaler.wholesalerId,
                                wholesalerName: wholesaler.displayName,
                                profileImageUrl: wholesaler.profileImageUrl,
                                profileImageCacheKey: wholesaler.profileImageCacheToken,
                              ),
                            ),
                          );
                          if (!mounted) return;
                          await ref
                              .read(approvedWholesalersProvider.notifier)
                              .load(silent: true);
                        },
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
