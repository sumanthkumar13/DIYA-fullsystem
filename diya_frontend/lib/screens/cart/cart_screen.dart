import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/cart/cart_dto.dart';
import '../../models/orders/order_checkout.dart';
import '../../providers/cart_provider.dart';
import '../../providers/retailer_session_provider.dart';
import '../../providers/selected_wholesaler_provider.dart';
import '../../services/order_service.dart';
import '../../widgets/catalogue/cart_qty_control.dart';
import '../../widgets/ui/diya_button.dart';
import '../../widgets/ui/diya_card.dart';
import '../../widgets/wholesaler_picker_sheet.dart';

class CartScreen extends ConsumerStatefulWidget {
  const CartScreen({super.key});

  @override
  ConsumerState<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends ConsumerState<CartScreen> {
  bool _placing = false;

  @override
  void initState() {
    super.initState();
    Future.microtask(_bootstrap);
  }

  Future<void> _bootstrap() async {
    final cart = ref.read(cartProvider).valueOrNull;
    var wid = ref.read(selectedWholesalerIdProvider);
    if ((wid == null || wid.isEmpty) &&
        cart != null &&
        cart.wholesalerId.isNotEmpty) {
      ref.read(selectedWholesalerIdProvider.notifier).state = cart.wholesalerId;
      wid = cart.wholesalerId;
    }
    if (wid != null && wid.isNotEmpty) {
      await ref.read(cartProvider.notifier).loadCart(wid);
    }
  }

  Future<void> _loadForSelectedWholesaler() async {
    final wid = ref.read(selectedWholesalerIdProvider);
    if (wid == null || wid.isEmpty) return;
    await ref.read(cartProvider.notifier).loadCart(wid);
  }

  String _fmtInr(num value) => "₹${value.toStringAsFixed(0)}";

  Future<void> _placeOrder(CartDTO cart) async {
    if (_placing) return;
    if (cart.items.isEmpty) return;

    setState(() => _placing = true);
    try {
      final svc = OrderService();
      await svc.checkout(
        OrderCheckoutRequest(
          wholesalerId: cart.wholesalerId,
        ),
      );

      await ref.read(cartProvider.notifier).loadCart(cart.wholesalerId);
      await ref.read(retailerSessionProvider.notifier).sync();

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Order placed successfully')),
      );
      Navigator.pushReplacementNamed(context, '/orders');
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to place order: $e')),
      );
    } finally {
      if (mounted) setState(() => _placing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<AsyncValue<CartDTO?>>(cartProvider, (previous, next) {
      final cart = next.valueOrNull;
      if (cart == null || cart.wholesalerId.isEmpty) return;
      final selectedId = ref.read(selectedWholesalerIdProvider);
      if (selectedId == null || selectedId.isEmpty) {
        ref.read(selectedWholesalerIdProvider.notifier).state = cart.wholesalerId;
      }
    });

    final selected = ref.watch(selectedWholesalerProvider);
    final cartAsync = ref.watch(cartProvider);
    final cart = cartAsync.valueOrNull;
    final hasCartItems = cart != null && cart.items.isNotEmpty;

    if (selected == null && !hasCartItems) {
      if (cartAsync.isLoading) {
        return const Center(child: CircularProgressIndicator(color: Color(0xFFFF7A00)));
      }
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: DiyaCard(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.shopping_cart_outlined, size: 42, color: Color(0xFFA3A3A3)),
                const SizedBox(height: 10),
                const Text(
                  'Your cart is empty',
                  style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: Color(0xFF171717)),
                ),
                const SizedBox(height: 6),
                const Text(
                  'Select a wholesaler to start adding products.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF737373), fontSize: 13),
                ),
                const SizedBox(height: 14),
                DiyaButton(
                  fullWidth: true,
                  text: 'Browse wholesalers',
                  onPressed: () => openWholesalerPickerAndProceed(context, ref),
                ),
              ],
            ),
          ),
        ),
      );
    }

    if (cartAsync.isLoading && !hasCartItems) {
      return const Center(child: CircularProgressIndicator(color: Color(0xFFFF7A00)));
    }

    if (cartAsync.hasError && !hasCartItems) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: DiyaCard(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.error_outline, color: Color(0xFFDC2626)),
                const SizedBox(height: 10),
                Text(
                  'Couldn’t load cart: ${cartAsync.error}',
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF525252)),
                ),
                const SizedBox(height: 12),
                DiyaButton(
                  fullWidth: true,
                  text: 'Retry',
                  onPressed: _loadForSelectedWholesaler,
                ),
              ],
            ),
          ),
        ),
      );
    }

    final c = cart;
    final items = c?.items ?? const <CartItemDTO>[];

    if (items.isEmpty) {
      return ListView(
        children: [
          const SizedBox(height: 40),
          Center(
            child: DiyaCard(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: const [
                  Icon(Icons.shopping_cart_outlined, size: 56, color: Color(0xFFA3A3A3)),
                  SizedBox(height: 10),
                  Text(
                    'No items in cart',
                    style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: Color(0xFF171717)),
                  ),
                  SizedBox(height: 6),
                  Text(
                    'Add products from the catalogue.',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF737373), fontSize: 13),
                  ),
                ],
              ),
            ),
          ),
        ],
      );
    }

    final wholesalerLabel = c!.wholesalerName.isEmpty ? 'Wholesaler' : c.wholesalerName;
    final total = c.totalAmount;

    return Column(
      children: [
        Expanded(
          child: ListView.separated(
            itemCount: items.length + 1,
            separatorBuilder: (_, __) => const SizedBox(height: 10),
            itemBuilder: (context, index) {
              if (index == 0) {
                return DiyaCard(
                  child: Row(
                    children: [
                      const Icon(Icons.storefront, color: Color(0xFFFF7A00)),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          wholesalerLabel,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontWeight: FontWeight.w900, color: Color(0xFF171717)),
                        ),
                      ),
                      TextButton(
                        onPressed: () => openWholesalerPickerAndProceed(context, ref),
                        child: const Text(
                          'Change',
                          style: TextStyle(fontWeight: FontWeight.w900, color: Color(0xFFFF7A00)),
                        ),
                      )
                    ],
                  ),
                );
              }

              final it = items[index - 1];
              return DiyaCard(
                padding: const EdgeInsets.all(12),
                child: Row(
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: const Color(0xFFF5F5F5),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFE5E5E5)),
                      ),
                      clipBehavior: Clip.antiAlias,
                      child: (it.productImageUrl ?? '').trim().isEmpty
                          ? const Center(
                              child: Text(
                                'No\nImage',
                                textAlign: TextAlign.center,
                                style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: Color(0xFF737373)),
                              ),
                            )
                          : Image.network(
                              it.productImageUrl!,
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => const Center(
                                child: Text(
                                  'No\nImage',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: Color(0xFF737373)),
                                ),
                              ),
                            ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            it.productName,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontWeight: FontWeight.w900, color: Color(0xFF171717)),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${_fmtInr(it.price)} × ${it.quantity} = ${_fmtInr(it.total)}',
                            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12, color: Color(0xFF737373)),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 10),
                    SizedBox(
                      width: 108,
                      child: CartQtyControl(
                        quantity: it.quantity,
                        compact: true,
                        onDecrement: () =>
                            ref.read(cartProvider.notifier).setQuantity(it.productId, it.quantity - 1),
                        onIncrement: () =>
                            ref.read(cartProvider.notifier).setQuantity(it.productId, it.quantity + 1),
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 10),
        DiyaCard(
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Grand Total',
                    style: TextStyle(fontWeight: FontWeight.w900, color: Color(0xFF171717)),
                  ),
                  Text(
                    _fmtInr(total),
                    style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: Color(0xFF171717)),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              DiyaButton(
                fullWidth: true,
                text: _placing ? 'Placing order…' : 'Place Order',
                onPressed: _placing ? null : () => _placeOrder(c),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
