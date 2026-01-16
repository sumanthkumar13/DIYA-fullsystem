import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../widgets/layout/retailer_shell.dart';
import '../../widgets/ui/diya_button.dart';
import '../../widgets/ui/diya_card.dart';

import '../../providers/products_provider.dart';
import '../../providers/cart_provider.dart';
import '../../providers/selected_wholesaler_provider.dart'; // ✅ added import
import '../../services/order_service.dart';
import '../../models/orders/order_checkout.dart';
import '../../models/cart/cart_dto.dart';
import '../../models/products/product_dto.dart';

class NewOrderScreen extends ConsumerStatefulWidget {
  const NewOrderScreen({super.key});

  @override
  ConsumerState<NewOrderScreen> createState() => _NewOrderScreenState();
}

class _NewOrderScreenState extends ConsumerState<NewOrderScreen> {
  String step = "wholesaler"; // wholesaler | products | cart
  String? selectedWholesalerId; // comes from cart response
  String selectedWholesalerName = "Wholesaler";

  final searchCtrl = TextEditingController();
  bool placingOrder = false;

  // ✅ TEMP: until you send retailer approved wholesalers endpoint integration
  // We’ll use these placeholders for wholesaler selection list.
  final wholesalers = const [
    {
      "id": "11111111-1111-1111-1111-111111111111",
      "name": "Ravi Wholesales",
      "location": "Hyderabad"
    },
    {
      "id": "22222222-2222-2222-2222-222222222222",
      "name": "Sri Balaji Traders",
      "location": "Mumbai"
    },
  ];

  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      ref.read(productsProvider.notifier).fetchProducts();
    });
  }

  @override
  void dispose() {
    searchCtrl.dispose();
    super.dispose();
  }

  int getCartQtyFromCart(CartDTO? cart, String productId) {
    if (cart == null) return 0;
    final item = cart.items.where((x) => x.productId == productId).toList();
    if (item.isEmpty) return 0;
    return item.first.quantity;
  }

  // --- STEP 1: wholesaler selection ---
  @override
  Widget build(BuildContext context) {
    final productsState = ref.watch(productsProvider);
    final cartState = ref.watch(cartProvider);
    final cart = cartState.value;

    if (step == "wholesaler") {
      return RetailerShell(
        title: "New Order",
        hideNav: true,
        current: NavTab.home,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text("Select Wholesaler",
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
            const SizedBox(height: 12),
            ...wholesalers.map((w) {
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: DiyaCard(
                  onTap: () async {
                    setState(() {
                      selectedWholesalerId = w["id"].toString();
                      selectedWholesalerName = w["name"].toString();
                      step = "products";
                    });

                    // ✅ save wholesaler globally for product APIs
                    ref
                        .read(selectedWholesalerIdProvider.notifier)
                        .state = selectedWholesalerId!;

                    // ✅ load wholesaler cart
                    await ref
                        .read(cartProvider.notifier)
                        .loadCart(selectedWholesalerId!);

                    // ✅ NOW load products (wholesalerId exists)
                    await ref
                        .read(productsProvider.notifier)
                        .fetchProducts();
                  },
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(w["name"].toString(),
                          style: const TextStyle(fontWeight: FontWeight.w900)),
                      const SizedBox(height: 4),
                      Text(w["location"].toString(),
                          style:
                              const TextStyle(color: Color(0xFF737373))),
                    ],
                  ),
                ),
              );
            }),
          ],
        ),
      );
    }

    // --- STEP 2 & 3: products/cart ---
    final cartItemCount = cart?.totalItems ?? 0;
    final cartTotal = cart?.totalAmount ?? 0;

    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: Container(
              color: Colors.white,
              child: Stack(
                children: [
                  Column(
                    children: [
                      _Header(),
                      Expanded(
                        child: Container(
                          color: const Color(0xFFFAFAFA),
                          padding: const EdgeInsets.all(16),
                          child: SingleChildScrollView(
                            padding: EdgeInsets.only(
                                bottom: cartItemCount > 0 ? 120 : 16),
                            child: (step == "products")
                                ? _Products(
                                    productsState: productsState, cart: cart)
                                : _Cart(cart: cart),
                          ),
                        ),
                      ),
                    ],
                  ),

                  // bottom bar
                  if (cartItemCount > 0)
                    Positioned(
                      left: 0,
                      right: 0,
                      bottom: 0,
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: const BoxDecoration(
                          color: Colors.white,
                          border: Border(
                              top: BorderSide(color: Color(0xFFF5F5F5))),
                          boxShadow: [
                            BoxShadow(
                              color: Color(0x14000000),
                              blurRadius: 10,
                              offset: Offset(0, -4),
                            )
                          ],
                        ),
                        child: (step == "products")
                            ? Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  Row(
                                    children: [
                                      Stack(
                                        children: [
                                          Container(
                                            width: 42,
                                            height: 42,
                                            decoration: const BoxDecoration(
                                              color: Color(0xFF171717),
                                              shape: BoxShape.circle,
                                            ),
                                            child: const Icon(
                                              Icons.shopping_cart_outlined,
                                              color: Colors.white,
                                              size: 20,
                                            ),
                                          ),
                                          Positioned(
                                            top: -2,
                                            right: -2,
                                            child: Container(
                                              width: 20,
                                              height: 20,
                                              decoration: BoxDecoration(
                                                color:
                                                    const Color(0xFFFF7A00),
                                                shape: BoxShape.circle,
                                                border: Border.all(
                                                    color: Colors.white,
                                                    width: 2),
                                              ),
                                              child: Center(
                                                child: Text(
                                                  "$cartItemCount",
                                                  style: const TextStyle(
                                                    fontSize: 10,
                                                    fontWeight:
                                                        FontWeight.w900,
                                                    color: Colors.white,
                                                  ),
                                                ),
                                              ),
                                            ),
                                          )
                                        ],
                                      ),
                                      const SizedBox(width: 10),
                                      Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            "₹${cartTotal.toStringAsFixed(0)}",
                                            style: const TextStyle(
                                                fontWeight: FontWeight.w900),
                                          ),
                                          const Text(
                                            "TOTAL",
                                            style: TextStyle(
                                              fontSize: 10,
                                              fontWeight: FontWeight.w900,
                                              color: Color(0xFF737373),
                                              letterSpacing: 1.2,
                                            ),
                                          )
                                        ],
                                      ),
                                    ],
                                  ),
                                  DiyaButton(
                                    text: "View Cart",
                                    onPressed: () =>
                                        setState(() => step = "cart"),
                                  )
                                ],
                              )
                            : DiyaButton(
                                fullWidth: true,
                                text: "Place Order",
                                isLoading: placingOrder,
                                onPressed: placingOrder
                                    ? null
                                    : () async {
                                        if (selectedWholesalerId == null) return;

                                        setState(() => placingOrder = true);
                                        try {
                                          final svc = OrderService();
                                          final resp = await svc.checkout(
                                            OrderCheckoutRequest(
                                              wholesalerId:
                                                  selectedWholesalerId!,
                                              paymentMethod: "upi",
                                              paymentReference: "retailer_app",
                                            ),
                                          );

                                          if (!mounted) return;
                                          ScaffoldMessenger.of(context)
                                              .showSnackBar(
                                            SnackBar(
                                                content: Text(
                                                    "Order placed ✅ ${resp.orderNumber}")),
                                          );
                                          Navigator.pushReplacementNamed(
                                              context, '/orders');
                                        } catch (e) {
                                          ScaffoldMessenger.of(context)
                                              .showSnackBar(
                                            SnackBar(
                                                content: Text(
                                                    "Order failed ❌ $e")),
                                          );
                                        } finally {
                                          if (mounted) {
                                            setState(() => placingOrder = false);
                                          }
                                        }
                                      },
                              ),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _Header() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(bottom: BorderSide(color: Color(0xFFF5F5F5))),
      ),
      child: Row(
        children: [
          InkWell(
            onTap: () {
              setState(() {
                if (step == "cart") step = "products";
                else step = "wholesaler";
              });
            },
            borderRadius: BorderRadius.circular(999),
            child: const Padding(
              padding: EdgeInsets.all(10),
              child: Icon(Icons.chevron_left, size: 22),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  step == "cart" ? "Review Cart" : selectedWholesalerName,
                  style: const TextStyle(
                      fontWeight: FontWeight.w900, fontSize: 16),
                ),
                if (step == "products")
                  const Text(
                    "Add items to your order",
                    style: TextStyle(fontSize: 12, color: Color(0xFF737373)),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _Products({
    required AsyncValue<List<ProductResponseDTO>> productsState,
    required CartDTO? cart,
  }) {
    return Column(
      children: [
        // Search bar
        Container(
          margin: const EdgeInsets.only(bottom: 18),
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFFE5E5E5)),
          ),
          child: Row(
            children: [
              const Icon(Icons.search, size: 18, color: Color(0xFFA3A3A3)),
              const SizedBox(width: 10),
              Expanded(
                child: TextField(
                  controller: searchCtrl,
                  onChanged: (v) async {
                    await ref
                        .read(productsProvider.notifier)
                        .fetchProducts(search: v);
                  },
                  decoration: const InputDecoration(
                    hintText: "Search products...",
                    border: InputBorder.none,
                  ),
                ),
              ),
            ],
          ),
        ),

        productsState.when(
          loading: () => const Padding(
            padding: EdgeInsets.only(top: 30),
            child: Center(child: CircularProgressIndicator()),
          ),
          error: (e, _) => Center(child: Text("Error: $e")),
          data: (products) {
            if (products.isEmpty) {
              return const Center(
                child: Padding(
                  padding: EdgeInsets.only(top: 40),
                  child: Text(
                    "No products found",
                    style: TextStyle(color: Color(0xFF737373)),
                  ),
                ),
              );
            }

            return Column(
              children: products.map((p) {
                final qty = getCartQtyFromCart(cart, p.id);

                return Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFFF5F5F5)),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 72,
                        height: 72,
                        decoration: BoxDecoration(
                          color: const Color(0xFFF5F5F5),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: (p.imageUrl == null || p.imageUrl!.isEmpty)
                            ? const Icon(Icons.image_outlined,
                                color: Color(0xFFA3A3A3))
                            : ClipRRect(
                                borderRadius: BorderRadius.circular(12),
                                child: Image.network(p.imageUrl!,
                                    fit: BoxFit.cover),
                              ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              p.name,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontWeight: FontWeight.w900),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              p.description ?? "No description",
                              style: const TextStyle(
                                  fontSize: 12, color: Color(0xFF737373)),
                            ),
                            const SizedBox(height: 10),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  "₹${p.price.toStringAsFixed(0)}",
                                  style: const TextStyle(fontWeight: FontWeight.w900),
                                ),
                                if (qty == 0)
                                  GestureDetector(
                                    onTap: () async {
                                      await ref
                                          .read(cartProvider.notifier)
                                          .addItem(p.id);
                                    },
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 14, vertical: 7),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFFFE7D1),
                                        borderRadius: BorderRadius.circular(10),
                                      ),
                                      child: const Text(
                                        "ADD",
                                        style: TextStyle(
                                          color: Color(0xFFFF7A00),
                                          fontWeight: FontWeight.w900,
                                          fontSize: 11,
                                          letterSpacing: 1.2,
                                        ),
                                      ),
                                    ),
                                  )
                                else
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 8, vertical: 6),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFFF7A00),
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: Row(
                                      children: [
                                        GestureDetector(
                                          onTap: () async {
                                            await ref
                                                .read(cartProvider.notifier)
                                                .setQuantity(p.id, qty - 1);
                                          },
                                          child: const Icon(Icons.remove,
                                              size: 16, color: Colors.white),
                                        ),
                                        const SizedBox(width: 10),
                                        SizedBox(
                                          width: 14,
                                          child: Center(
                                            child: Text(
                                              "$qty",
                                              style: const TextStyle(
                                                fontWeight: FontWeight.w900,
                                                fontSize: 12,
                                                color: Colors.white,
                                              ),
                                            ),
                                          ),
                                        ),
                                        const SizedBox(width: 10),
                                        GestureDetector(
                                          onTap: () async {
                                            await ref
                                                .read(cartProvider.notifier)
                                                .setQuantity(p.id, qty + 1);
                                          },
                                          child: const Icon(Icons.add,
                                              size: 16, color: Colors.white),
                                        ),
                                      ],
                                    ),
                                  )
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              }).toList(),
            );
          },
        ),
      ],
    );
  }

  Widget _Cart({required CartDTO? cart}) {
    if (cart == null || cart.items.isEmpty) {
      return const Padding(
        padding: EdgeInsets.only(top: 50),
        child: Center(
          child: Text("Cart is empty",
              style: TextStyle(color: Color(0xFFA3A3A3))),
        ),
      );
    }

    final subtotal = cart.totalAmount;
    final tax = (subtotal * 0.05).round();
    final total = (subtotal * 1.05).round();

    return Column(
      children: [
        ...cart.items.map((item) {
          return Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFFF5F5F5)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(item.productName,
                          style: const TextStyle(fontWeight: FontWeight.w900)),
                      const SizedBox(height: 4),
                      Text(
                        "₹${item.price.toStringAsFixed(0)} x ${item.quantity}",
                        style:
                            const TextStyle(fontSize: 12, color: Color(0xFF737373)),
                      ),
                    ],
                  ),
                ),
                Text("₹${item.total.toStringAsFixed(0)}",
                    style: const TextStyle(fontWeight: FontWeight.w900)),
              ],
            ),
          );
        }),

        Container(
          margin: const EdgeInsets.only(top: 8),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFFF5F5F5)),
          ),
          child: Column(
            children: [
              _LineRow(
                  label: "Subtotal", value: "₹${subtotal.toStringAsFixed(0)}"),
              const SizedBox(height: 8),
              _LineRow(label: "Tax (5%)", value: "₹$tax"),
              const SizedBox(height: 12),
              const Divider(color: Color(0xFFE5E5E5)),
              const SizedBox(height: 10),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text("Total",
                      style:
                          TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
                  Text("₹$total",
                      style:
                          const TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _LineRow extends StatelessWidget {
  final String label;
  final String value;

  const _LineRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: const TextStyle(
              color: Color(0xFF737373), fontWeight: FontWeight.w600),
        ),
        Text(
          value,
          style: const TextStyle(
              color: Color(0xFF737373), fontWeight: FontWeight.w700),
        ),
      ],
    );
  }
}
