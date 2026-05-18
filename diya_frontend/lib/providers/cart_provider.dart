import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/cart/cart_dto.dart';
import '../services/cart_service.dart';

final cartServiceProvider = Provider<CartService>((ref) => CartService());

final cartProvider = StateNotifierProvider<CartNotifier, AsyncValue<CartDTO?>>((ref) {
  return CartNotifier(ref.read(cartServiceProvider));
});

/// Badge count — stays stable during background cart updates.
final cartBadgeCountProvider = Provider<int>((ref) {
  final cart = ref.watch(cartProvider);
  return cart.maybeWhen(
    data: (c) => c?.totalItems ?? 0,
    orElse: () => 0,
  );
});

final cartQuantityProvider = Provider.family<int, String>((ref, productId) {
  final cart = ref.watch(cartProvider).valueOrNull;
  if (cart == null) return 0;
  return cart.quantityFor(productId);
});

class CartNotifier extends StateNotifier<AsyncValue<CartDTO?>> {
  final CartService _service;

  CartNotifier(this._service) : super(const AsyncValue.data(null));

  String? get activeWholesalerId => state.valueOrNull?.wholesalerId;

  Future<void> loadCart(String wholesalerId) async {
    final previous = state.valueOrNull;
    if (previous == null) {
      state = const AsyncValue.loading();
    }
    try {
      final cart = await _service.getCart(wholesalerId: wholesalerId);
      state = AsyncValue.data(cart);
    } catch (e, st) {
      if (previous != null) {
        state = AsyncValue.data(previous);
      } else {
        state = AsyncValue.error(e, st);
      }
    }
  }

  Future<void> addItem(String productId) async {
    final snapshot = state;
    final current = snapshot.valueOrNull;
    try {
      if (current != null) {
        final existing = current.items.where((i) => i.productId == productId).toList();
        if (existing.isNotEmpty) {
          final item = existing.first;
          _applyOptimisticQuantity(productId, item.quantity + 1);
        }
      }
      final cart = await _service.addToCart(productId: productId, quantity: 1);
      state = AsyncValue.data(cart);
    } catch (e, st) {
      state = snapshot.hasValue ? snapshot : AsyncValue.error(e, st);
    }
  }

  Future<void> setQuantity(String productId, int quantity) async {
    final snapshot = state;
    final current = snapshot.valueOrNull;

    if (current != null) {
      if (quantity <= 0) {
        _applyOptimisticRemove(productId);
      } else if (current.items.any((i) => i.productId == productId)) {
        _applyOptimisticQuantity(productId, quantity);
      }
    }

    try {
      final CartDTO cart;
      if (quantity <= 0) {
        cart = await _service.removeFromCart(productId: productId);
      } else {
        cart = await _service.updateCart(productId: productId, quantity: quantity);
      }
      state = AsyncValue.data(cart);
    } catch (e, st) {
      state = snapshot.hasValue ? snapshot : AsyncValue.error(e, st);
    }
  }

  void _applyOptimisticQuantity(String productId, int quantity) {
    final current = state.valueOrNull;
    if (current == null) return;

    final items = current.items.map((item) {
      if (item.productId != productId) return item;
      return item.copyWith(
        quantity: quantity,
        total: item.price * quantity,
      );
    }).toList();

    state = AsyncValue.data(_withTotals(current, items));
  }

  void _applyOptimisticRemove(String productId) {
    final current = state.valueOrNull;
    if (current == null) return;

    final items = current.items.where((i) => i.productId != productId).toList();
    state = AsyncValue.data(_withTotals(current, items));
  }

  CartDTO _withTotals(CartDTO cart, List<CartItemDTO> items) {
    final totalAmount = items.fold<double>(0, (sum, i) => sum + i.total);
    final totalItems = items.fold<int>(0, (sum, i) => sum + i.quantity);
    return cart.copyWith(
      items: items,
      totalAmount: totalAmount,
      totalItems: totalItems,
    );
  }
}
