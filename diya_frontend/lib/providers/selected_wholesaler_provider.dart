import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/connections/connection_response_dto.dart';
import 'approved_wholesalers_provider.dart';

final selectedWholesalerIdProvider = StateProvider<String?>((ref) => null);

/// Provider that returns the selected wholesaler details
final selectedWholesalerProvider = Provider<ConnectionResponseDTO?>((ref) {
  final selectedId = ref.watch(selectedWholesalerIdProvider);
  if (selectedId == null || selectedId.isEmpty) return null;

  final wholesalersAsync = ref.watch(approvedWholesalersProvider);
  return wholesalersAsync.maybeWhen(
    data: (wholesalers) {
      try {
        return wholesalers.firstWhere(
          (w) => w.wholesalerId == selectedId,
        );
      } catch (_) {
        return null;
      }
    },
    orElse: () => null,
  );
});
