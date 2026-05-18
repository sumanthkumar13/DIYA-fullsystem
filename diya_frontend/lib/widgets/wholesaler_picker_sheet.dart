import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/approved_wholesalers_provider.dart';
import '../providers/selected_wholesaler_provider.dart';
import '../models/connections/connection_response_dto.dart';
import '../screens/catalogue/wholesaler_catalogue_screen.dart';
import '../widgets/ui/diya_button.dart';
import '../widgets/wholesalers/wholesaler_summary_card.dart';
import '../utils/wholesaler_display.dart';

/// Opens a bottom sheet to select a wholesaler, then navigates to catalogue.
Future<void> openWholesalerPickerAndProceed(BuildContext context, WidgetRef ref) async {
  // Always refetch before opening to avoid stale state after approvals.
  await ref.read(approvedWholesalersProvider.notifier).load();
  final wholesalersAsync = ref.read(approvedWholesalersProvider);

  await wholesalersAsync.when(
    data: (wholesalers) async {
      if (wholesalers.isEmpty) {
        // Show empty state in bottom sheet
        await showModalBottomSheet(
          context: context,
          isScrollControlled: true,
          backgroundColor: Colors.transparent,
          builder: (context) => _EmptyWholesalersSheet(),
        );
        return;
      }

      // Show picker sheet
      final selected = await showModalBottomSheet<ConnectionResponseDTO>(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (context) => _WholesalerPickerSheet(wholesalers: wholesalers),
      );

      if (selected != null && context.mounted) {
        // Set selected wholesaler in provider
        ref.read(selectedWholesalerIdProvider.notifier).state = selected.wholesalerId;
        
        // Navigate to catalogue (single consistent flow across app)
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => WholesalerCatalogueScreen(
              wholesalerId: selected.wholesalerId,
              wholesalerName: selected.displayName,
              profileImageUrl: selected.profileImageUrl,
              profileImageCacheKey: selected.profileImageCacheToken,
            ),
          ),
        );
      }
    },
    loading: () async {
      // Show loading state
      await showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (context) => const _LoadingSheet(),
      );
    },
    error: (error, stack) async {
      // Show error state
      await showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (context) => _ErrorSheet(error: error.toString()),
      );
    },
  );
}

class _WholesalerPickerSheet extends StatelessWidget {
  final List<ConnectionResponseDTO> wholesalers;

  const _WholesalerPickerSheet({required this.wholesalers});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Handle bar
            Container(
              margin: const EdgeInsets.only(top: 12, bottom: 8),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: const Color(0xFFE5E5E5),
                borderRadius: BorderRadius.circular(2),
              ),
            ),

            // Title
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    "Select Wholesaler",
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w900,
                      color: Color(0xFF171717),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, color: Color(0xFF737373)),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),

            // List of wholesalers
            Flexible(
              child: ListView.builder(
                shrinkWrap: true,
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
                itemCount: wholesalers.length,
                itemBuilder: (context, index) {
                  final wholesaler = wholesalers[index];
                  return Padding(
                    padding: EdgeInsets.only(
                      bottom: index == wholesalers.length - 1 ? 0 : 12,
                    ),
                    child: WholesalerSummaryCard(
                      wholesaler: wholesaler,
                      onTap: () => Navigator.pop(context, wholesaler),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _EmptyWholesalersSheet extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Handle bar
              Container(
                margin: const EdgeInsets.only(bottom: 20),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: const Color(0xFFE5E5E5),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),

              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  color: const Color(0xFFFFE7D1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.storefront_outlined,
                  size: 40,
                  color: Color(0xFFFF7A00),
                ),
              ),
              const SizedBox(height: 20),
              const Text(
                "No Connected Wholesalers",
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF171717),
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                "Connect with wholesalers to start ordering products",
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 14,
                  color: Color(0xFF737373),
                ),
              ),
              const SizedBox(height: 24),
              DiyaButton(
                text: "Find Wholesalers",
                onPressed: () {
                  Navigator.pop(context);
                  Navigator.pushNamed(context, '/connect');
                },
                variant: DiyaButtonVariant.primary,
                fullWidth: true,
              ),
              const SizedBox(height: 12),
              DiyaButton(
                text: "Cancel",
                onPressed: () => Navigator.pop(context),
                variant: DiyaButtonVariant.outline,
                fullWidth: true,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _LoadingSheet extends StatelessWidget {
  const _LoadingSheet();

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                margin: const EdgeInsets.only(bottom: 20),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: const Color(0xFFE5E5E5),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const CircularProgressIndicator(
                color: Color(0xFFFF7A00),
              ),
              const SizedBox(height: 16),
              const Text(
                "Loading wholesalers...",
                style: TextStyle(
                  fontSize: 14,
                  color: Color(0xFF737373),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ErrorSheet extends StatelessWidget {
  final String error;

  const _ErrorSheet({required this.error});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                margin: const EdgeInsets.only(bottom: 20),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: const Color(0xFFE5E5E5),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const Icon(
                Icons.error_outline,
                size: 48,
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
                error,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 14,
                  color: Color(0xFF737373),
                ),
              ),
              const SizedBox(height: 24),
              DiyaButton(
                text: "Close",
                onPressed: () => Navigator.pop(context),
                variant: DiyaButtonVariant.primary,
                fullWidth: true,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
