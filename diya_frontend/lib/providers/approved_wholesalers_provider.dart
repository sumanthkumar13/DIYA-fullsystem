import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/connections/connection_response_dto.dart';
import '../services/connection_service.dart';

final connectionServiceProvider = Provider<ConnectionService>((ref) => ConnectionService());

final approvedWholesalersProvider =
    StateNotifierProvider<ApprovedWholesalersNotifier, AsyncValue<List<ConnectionResponseDTO>>>((ref) {
  return ApprovedWholesalersNotifier(ref.read(connectionServiceProvider));
});

class ApprovedWholesalersNotifier extends StateNotifier<AsyncValue<List<ConnectionResponseDTO>>> {
  final ConnectionService _service;

  ApprovedWholesalersNotifier(this._service) : super(const AsyncValue.loading()) {
    load();
  }

  Future<void> load() async {
    try {
      state = const AsyncValue.loading();
      final list = await _service.getApprovedWholesalers();
      state = AsyncValue.data(list);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }
}
