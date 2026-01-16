import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/cart/cart_dto.dart';
import '../services/cart_service.dart';

final cartServiceProvider = Provider<CartService>((ref) => CartService());

final cartProvider = StateNotifierProvider<CartNotifier, AsyncValue<CartDTO?>>((ref) {
  return CartNotifier(ref.read(cartServiceProvider));
});

class CartNotifier extends StateNotifier<AsyncValue<CartDTO?>> {
  final CartService _service;

  CartNotifier(this._service) : super(const AsyncValue.data(null));

  Future<void> loadCart(String wholesalerId) async {
    try {
      state = const AsyncValue.loading();
      final cart = await _service.getCart(wholesalerId: wholesalerId);
      state = AsyncValue.data(cart);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> addItem(String productId) async {
    final current = state.value;
    try {
      // optimistic loading not needed, but we can keep UI smooth
      state = const AsyncValue.loading();
      final cart = await _service.addToCart(productId: productId, quantity: 1);
      state = AsyncValue.data(cart);
    } catch (e, st) {
      state = AsyncValue.data(current);
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> setQuantity(String productId, int quantity) async {
    final current = state.value;
    try {
      state = const AsyncValue.loading();
      if (quantity <= 0) {
        final cart = await _service.removeFromCart(productId: productId);
        state = AsyncValue.data(cart);
      } else {
        final cart = await _service.updateCart(productId: productId, quantity: quantity);
        state = AsyncValue.data(cart);
      }
    } catch (e, st) {
      state = AsyncValue.data(current);
      state = AsyncValue.error(e, st);
    }
  }
}
