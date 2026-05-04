import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/cart/cart_dto.dart';
import '../../models/orders/order_checkout.dart';
import '../../providers/cart_provider.dart';
import '../../providers/retailer_session_provider.dart';
import '../../providers/selected_wholesaler_provider.dart';
import '../../services/order_service.dart';
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
    Future.microtask(_loadForSelectedWholesaler);
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

      // Refresh: cart should be cleared by backend post-checkout
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
    final selected = ref.watch(selectedWholesalerProvider);
    final cartAsync = ref.watch(cartProvider);

    // No wholesaler selected → direct the user to picker (cart is wholesaler-scoped)
    if (selected == null) {
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

    return cartAsync.when(
      loading: () => const Center(child: CircularProgressIndicator(color: Color(0xFFFF7A00))),
      error: (e, _) => Center(
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: DiyaCard(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.error_outline, color: Color(0xFFDC2626)),
                const SizedBox(height: 10),
                Text(
                  'Couldn’t load cart: $e',
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
      ),
      data: (cart) {
        final c = cart;
        final items = c?.items ?? const <CartItemDTO>[];
        final total = c?.totalAmount ?? 0;

        if (c == null || items.isEmpty) {
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
                              c.wholesalerName.isEmpty ? 'Wholesaler' : c.wholesalerName,
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
                        Column(
                          children: [
                            _QtyStepper(
                              qty: it.quantity,
                              onDec: () => ref.read(cartProvider.notifier).setQuantity(it.productId, it.quantity - 1),
                              onInc: () => ref.read(cartProvider.notifier).setQuantity(it.productId, it.quantity + 1),
                            ),
                            const SizedBox(height: 6),
                            TextButton(
                              onPressed: () => ref.read(cartProvider.notifier).setQuantity(it.productId, 0),
                              child: const Text(
                                'Remove',
                                style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12, color: Color(0xFFDC2626)),
                              ),
                            ),
                          ],
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
      },
    );
  }
}

class _QtyStepper extends StatelessWidget {
  final int qty;
  final VoidCallback onDec;
  final VoidCallback onInc;

  const _QtyStepper({
    required this.qty,
    required this.onDec,
    required this.onInc,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFFF5F5F5),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE5E5E5)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          IconButton(
            onPressed: onDec,
            icon: const Icon(Icons.remove, size: 18),
            color: const Color(0xFF404040),
            constraints: const BoxConstraints(minWidth: 34, minHeight: 34),
            padding: EdgeInsets.zero,
          ),
          SizedBox(
            width: 26,
            child: Text(
              '$qty',
              textAlign: TextAlign.center,
              style: const TextStyle(fontWeight: FontWeight.w900, color: Color(0xFF171717)),
            ),
          ),
          IconButton(
            onPressed: onInc,
            icon: const Icon(Icons.add, size: 18),
            color: const Color(0xFF404040),
            constraints: const BoxConstraints(minWidth: 34, minHeight: 34),
            padding: EdgeInsets.zero,
          ),
        ],
      ),
    );
  }
}

