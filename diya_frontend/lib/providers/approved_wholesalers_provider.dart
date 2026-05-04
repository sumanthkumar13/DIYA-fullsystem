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
  bool _disposed = false;

  ApprovedWholesalersNotifier(this._service) : super(const AsyncValue.loading()) {
    load();
  }

  @override
  void dispose() {
    _disposed = true;
    super.dispose();
  }

  Future<void> load() async {
    try {
      state = const AsyncValue.loading();
      final list = await _service.getApprovedWholesalers();
      if (_disposed) return;
      state = AsyncValue.data(list);
    } catch (e, st) {
      if (_disposed) return;
      state = AsyncValue.error(e, st);
    }
  }
}
