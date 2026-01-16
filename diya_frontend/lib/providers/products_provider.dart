import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/products/product_dto.dart';
import '../services/product_service.dart';
import 'selected_wholesaler_provider.dart';

final productServiceProvider = Provider<ProductService>((ref) => ProductService());

final productsProvider =
    StateNotifierProvider<ProductsNotifier, AsyncValue<List<ProductResponseDTO>>>((ref) {
  return ProductsNotifier(ref);
});

class ProductsNotifier extends StateNotifier<AsyncValue<List<ProductResponseDTO>>> {
  final Ref _ref;

  ProductsNotifier(this._ref) : super(const AsyncValue.data([]));

  Future<void> fetchProducts({String? search}) async {
    try {
      final wholesalerId = _ref.read(selectedWholesalerIdProvider);

      if (wholesalerId == null || wholesalerId.isEmpty) {
        state = AsyncValue.error("No wholesaler selected", StackTrace.current);
        return;
      }

      state = const AsyncValue.loading();

      final service = _ref.read(productServiceProvider);

      final page = await service.getProducts(
        wholesalerId: wholesalerId,
        search: search,
        page: 0,
        size: 50,
      );

      state = AsyncValue.data(page.content);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }
}
