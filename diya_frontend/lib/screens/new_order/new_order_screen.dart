import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../widgets/layout/retailer_shell.dart';
import '../../widgets/ui/diya_button.dart';
import '../../widgets/ui/diya_card.dart';
import '../../widgets/wholesaler_picker_sheet.dart';

import '../../providers/products_provider.dart';
import '../../providers/cart_provider.dart';
import '../../providers/selected_wholesaler_provider.dart';
import '../../services/order_service.dart';
import '../../models/orders/order_checkout.dart';
import '../../models/cart/cart_dto.dart';
import '../../models/products/product_dto.dart';
import '../../providers/retailer_session_provider.dart';
import 'package:dio/dio.dart';

class NewOrderScreen extends ConsumerStatefulWidget {
  const NewOrderScreen({super.key});

  @override
  ConsumerState<NewOrderScreen> createState() => _NewOrderScreenState();
}
  
class _NewOrderScreenState extends ConsumerState<NewOrderScreen> {
  String step = "products"; // products | cart
  final searchCtrl = TextEditingController();
  bool placingOrder = false;
  Timer? _debounceTimer;
  String? _lastLoadedWholesalerId;

  /// Track selected cart items by productId
  final Set<String> _selectedProductIds = {}; // ✅ keep final set, never reassign

  @override
  void initState() {
    super.initState();
    searchCtrl.addListener(_onSearchChanged);
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    searchCtrl.dispose();
    super.dispose();
  }

  void _onSearchChanged() {
    _debounceTimer?.cancel();
    _debounceTimer = Timer(const Duration(milliseconds: 300), () {
      final query = searchCtrl.text.trim();
      ref.read(productsProvider.notifier).fetchProducts(
            search: query.isEmpty ? null : query,
          );
    });
  }

  // Auto-load cart and products when wholesaler is selected
  void _loadDataForWholesaler(String wholesalerId) {
    if (_lastLoadedWholesalerId == wholesalerId) return;
    _lastLoadedWholesalerId = wholesalerId;

    Future.microtask(() async {
      await ref.read(cartProvider.notifier).loadCart(wholesalerId);
      await ref.read(productsProvider.notifier).fetchProducts();
    });
  }

  // Toggle selection for a single item
  void _toggleItemSelection(String productId) {
    setState(() {
      if (_selectedProductIds.contains(productId)) {
        _selectedProductIds.remove(productId);
      } else {
        _selectedProductIds.add(productId);
      }
    });
  }

  // ✅ Toggle select all (NEVER reassign the set)
  void _toggleSelectAll(CartDTO? cart) {
    if (cart == null || cart.items.isEmpty) return;

    setState(() {
      final ids = cart.items
          .map((item) => item.productId)
          .whereType<String>() // ✅ removes nulls safely
          .toList();

      if (_selectedProductIds.length == ids.length) {
        _selectedProductIds.clear();
      } else {
        _selectedProductIds
          ..clear()
          ..addAll(ids);
      }
    });
  }

  // Calculate totals for selected items only
  Map<String, double> _calculateSelectedTotals(CartDTO? cart) {
    if (cart == null || cart.items.isEmpty || _selectedProductIds.isEmpty) {
      return {'subtotal': 0.0, 'tax': 0.0, 'total': 0.0};
    }

    final selectedItems = cart.items.where((item) {
      final pid = item.productId;
      if (pid == null) return false;
      return _selectedProductIds.contains(pid);
    });

    final subtotal =
        selectedItems.fold<double>(0.0, (sum, item) => sum + item.total);

    final tax = (subtotal * 0.05).roundToDouble();
    final total = subtotal + tax;

    return {'subtotal': subtotal, 'tax': tax, 'total': total};
  }

  int getCartQtyFromCart(CartDTO? cart, String productId) {
    if (cart == null) return 0;
    final item = cart.items.where((x) => x.productId == productId).toList();
    if (item.isEmpty) return 0;
    return item.first.quantity;
  }

  @override
  Widget build(BuildContext context) {
    final selectedWholesalerId = ref.watch(selectedWholesalerIdProvider);
    final selectedWholesaler = ref.watch(selectedWholesalerProvider);
    final productsState = ref.watch(productsProvider);
    final cartState = ref.watch(cartProvider);
    final cart = cartState.value;

    // Listen for wholesaler changes and auto-load data
    ref.listen<String?>(selectedWholesalerIdProvider, (previous, next) {
      if (next != null && next.isNotEmpty && next != previous) {
        _loadDataForWholesaler(next);
      }
    });

    // ✅ CRITICAL FIX: Default select all ONCE after cart loads
    // DO NOT put inside setState repeatedly.
    if (cart != null && cart.items.isNotEmpty && _selectedProductIds.isEmpty) {
      _selectedProductIds.addAll(
        cart.items.map((e) => e.productId).whereType<String>(),
      );
    }

    // Auto-load if wholesaler is already selected
    if (selectedWholesalerId != null &&
        selectedWholesalerId.isNotEmpty &&
        _lastLoadedWholesalerId != selectedWholesalerId) {
      _loadDataForWholesaler(selectedWholesalerId);
    }

    // Show empty state if no wholesaler selected
    if (selectedWholesalerId == null || selectedWholesalerId.isEmpty) {
      return RetailerShell(
        title: "New Order",
        hideNav: true,
        current: NavTab.home,
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 120,
                  height: 120,
                  decoration: const BoxDecoration(
                    color: Color(0xFFFFE7D1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.shopping_cart_outlined,
                    size: 60,
                    color: Color(0xFFFF7A00),
                  ),
                ),
                const SizedBox(height: 24),
                const Text(
                  "Start a New Order",
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF171717),
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  "Select a wholesaler to browse products",
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 15,
                    color: Color(0xFF737373),
                  ),
                ),
                const SizedBox(height: 32),
                DiyaButton(
                  text: "Select Wholesaler",
                  onPressed: () => openWholesalerPickerAndProceed(context, ref),
                  variant: DiyaButtonVariant.primary,
                  fullWidth: true,
                ),
              ],
            ),
          ),
        ),
      );
    }

    // Products/Cart view
    final cartItemCount = cart?.totalItems ?? 0;
    final selectedTotalsForBar = _calculateSelectedTotals(cart);
    final selectedCountForBar = _selectedProductIds.length;

    final cartTotal = step == "cart"
        ? selectedTotalsForBar['total']!
        : (cart?.totalAmount ?? 0.0);

    final wholesalerName =
        selectedWholesaler?.wholesalerBusinessName ?? "Wholesaler";

    return RetailerShell(
      title: null,
      hideNav: true,
      current: NavTab.home,
      child: Stack(
        children: [
          Column(
            children: [
              // Header with wholesaler name and change button
              Container(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                decoration: const BoxDecoration(
                  color: Colors.white,
                  border: Border(bottom: BorderSide(color: Color(0xFFF5F5F5))),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            wholesalerName,
                            style: const TextStyle(
                              fontWeight: FontWeight.w900,
                              fontSize: 18,
                              color: Color(0xFF171717),
                            ),
                          ),
                          if (selectedWholesaler?.wholesalerCity.isNotEmpty ??
                              false) ...[
                            const SizedBox(height: 2),
                            Text(
                              selectedWholesaler!.wholesalerCity,
                              style: const TextStyle(
                                fontSize: 12,
                                color: Color(0xFF737373),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                    TextButton(
                      onPressed: () =>
                          openWholesalerPickerAndProceed(context, ref),
                      child: const Text(
                        "Change",
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFFFF7A00),
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // Search bar
              Container(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                decoration: const BoxDecoration(
                  color: Colors.white,
                  border: Border(bottom: BorderSide(color: Color(0xFFF5F5F5))),
                ),
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFAFAFA),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFE5E5E5)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.search,
                          size: 18, color: Color(0xFFA3A3A3)),
                      const SizedBox(width: 10),
                      Expanded(
                        child: TextField(
                          controller: searchCtrl,
                          decoration: const InputDecoration(
                            hintText: "Search name / SKU / code...",
                            border: InputBorder.none,
                            isDense: true,
                            contentPadding: EdgeInsets.zero,
                          ),
                        ),
                      ),
                      if (searchCtrl.text.isNotEmpty)
                        IconButton(
                          icon: const Icon(Icons.clear, size: 18),
                          color: const Color(0xFFA3A3A3),
                          onPressed: () {
                            searchCtrl.clear();
                            ref.read(productsProvider.notifier).fetchProducts();
                          },
                        ),
                    ],
                  ),
                ),
              ),

              // Products/Cart content
              Expanded(
                child: Container(
                  color: const Color(0xFFFAFAFA),
                  padding: const EdgeInsets.all(16),
                  child: SingleChildScrollView(
                    padding: EdgeInsets.only(
                        bottom: cartItemCount > 0 ? 120 : 16),
                    child: (step == "products")
                        ? _Products(
                            productsState: productsState,
                            cart: cart,
                          )
                        : _Cart(cart: cart),
                  ),
                ),
              ),
            ],
          ),

          // Bottom cart bar
          if (cartItemCount > 0 || (step == "cart" && selectedCountForBar > 0))
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: const BoxDecoration(
                  color: Colors.white,
                  border: Border(top: BorderSide(color: Color(0xFFF5F5F5))),
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
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
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
                                        color: const Color(0xFFFF7A00),
                                        shape: BoxShape.circle,
                                        border: Border.all(
                                            color: Colors.white, width: 2),
                                      ),
                                      child: Center(
                                        child: Text(
                                          "$cartItemCount",
                                          style: const TextStyle(
                                            fontSize: 10,
                                            fontWeight: FontWeight.w900,
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
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    "₹${cartTotal.toStringAsFixed(0)}",
                                    style: const TextStyle(
                                        fontWeight: FontWeight.w900),
                                  ),
                                  Text(
                                    step == "cart"
                                        ? "SELECTED TOTAL"
                                        : "TOTAL",
                                    style: const TextStyle(
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
                            onPressed: () => setState(() => step = "cart"),
                          )
                        ],
                      )
                    : Builder(
                        builder: (context) {
                          final selectedTotals =
                              _calculateSelectedTotals(cart);
                          final selectedCount = _selectedProductIds.length;
                          final isDisabled =
                              selectedCount == 0 || placingOrder;

                          return Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              if (selectedCount == 0)
                                Padding(
                                  padding:
                                      const EdgeInsets.only(bottom: 8),
                                  child: Text(
                                    "Select at least 1 item",
                                    style: const TextStyle(
                                      fontSize: 12,
                                      color: Color(0xFFF04343),
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                              DiyaButton(
                                fullWidth: true,
                                text: "Place Order",
                                isLoading: placingOrder,
                                onPressed: isDisabled
                                    ? null
                                    : () async {
                                        if (selectedWholesalerId == null) {
                                          print("❌ [PLACE ORDER] No wholesaler selected");
                                          return;
                                        }

                                        print("✅ [PLACE ORDER] Button tapped");
                                        print("📦 [PLACE ORDER] Wholesaler ID: $selectedWholesalerId");
                                        print("📦 [PLACE ORDER] Selected Product IDs: ${_selectedProductIds.toList()}");
                                        print("📦 [PLACE ORDER] Selected count: ${_selectedProductIds.length}");
                                        print("📦 [PLACE ORDER] Cart state: ${cartState.value?.items.length ?? 0} items");

                                        // Validate cart is loaded
                                        if (cart == null || cart.items.isEmpty) {
                                          print("❌ [PLACE ORDER] Cart is empty or not loaded");
                                          ScaffoldMessenger.of(context).showSnackBar(
                                            const SnackBar(
                                              content: Text("❌ Cart is empty. Please add items first."),
                                              backgroundColor: Colors.red,
                                            ),
                                          );
                                          return;
                                        }

                                        // Validate selected items exist in cart
                                        final cartProductIds = cart.items
                                            .map((item) => item.productId)
                                            .whereType<String>()
                                            .toSet();
                                        final invalidSelections = _selectedProductIds
                                            .where((id) => !cartProductIds.contains(id))
                                            .toList();
                                        
                                        if (invalidSelections.isNotEmpty) {
                                          print("❌ [PLACE ORDER] Invalid selected items: $invalidSelections");
                                          ScaffoldMessenger.of(context).showSnackBar(
                                            SnackBar(
                                              content: Text("❌ Some selected items are not in cart"),
                                              backgroundColor: Colors.red,
                                            ),
                                          );
                                          return;
                                        }

                                        setState(() => placingOrder = true);
                                        try {
                                          final request = OrderCheckoutRequest(
                                            wholesalerId: selectedWholesalerId!,
                                            paymentMethod: "upi",
                                            paymentReference: "retailer_app",
                                            selectedProductIds: _selectedProductIds.toList(),
                                          );

                                          print("📤 [PLACE ORDER] Request payload: ${request.toJson()}");

                                          final svc = OrderService();
                                          final resp = await svc.checkout(request);

                                          print("✅ [PLACE ORDER] Success! Order ID: ${resp.orderId}, Order Number: ${resp.orderNumber}");

                                          if (!mounted) return;

                                          // Refresh cart after successful order
                                          await ref.read(cartProvider.notifier).loadCart(selectedWholesalerId!);
                                          // Reactive global refresh (orders + dashboard)
                                          await ref.read(retailerSessionProvider.notifier).sync();

                                          ScaffoldMessenger.of(context).showSnackBar(
                                            SnackBar(
                                              content: Text("Order placed ✅ ${resp.orderNumber}"),
                                              backgroundColor: Colors.green,
                                            ),
                                          );

                                          // Clear selected items
                                          setState(() {
                                            _selectedProductIds.clear();
                                          });

                                          Navigator.pushReplacementNamed(context, '/orders');
                                        } catch (e, stackTrace) {
                                          print("❌ [PLACE ORDER] Error: $e");
                                          print("❌ [PLACE ORDER] Stack trace: $stackTrace");

                                          if (!mounted) return;

                                          String errorMessage = "Order failed";
                                          if (e is DioException) {
                                            final statusCode = e.response?.statusCode;
                                            final errorData = e.response?.data;
                                            print("❌ [PLACE ORDER] Status code: $statusCode");
                                            print("❌ [PLACE ORDER] Error data: $errorData");

                                            if (errorData is Map && errorData.containsKey('message')) {
                                              errorMessage = errorData['message'] ?? "Order failed";
                                            } else if (statusCode != null) {
                                              errorMessage = "Order failed (Status: $statusCode)";
                                            }
                                          } else {
                                            errorMessage = e.toString();
                                          }

                                          ScaffoldMessenger.of(context).showSnackBar(
                                            SnackBar(
                                              content: Text("❌ $errorMessage"),
                                              backgroundColor: Colors.red,
                                              duration: const Duration(seconds: 4),
                                            ),
                                          );
                                        } finally {
                                          if (mounted) {
                                            setState(() => placingOrder = false);
                                          }
                                        }
                                      },
                              ),
                            ],
                          );
                        },
                      ),
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
    return productsState.when(
      loading: () => const Padding(
        padding: EdgeInsets.only(top: 30),
        child: Center(
          child: CircularProgressIndicator(color: Color(0xFFFF7A00)),
        ),
      ),
      error: (e, _) => Center(
        child: Padding(
          padding: const EdgeInsets.only(top: 40),
          child: Column(
            children: [
              const Icon(Icons.error_outline,
                  size: 48, color: Color(0xFFF04343)),
              const SizedBox(height: 12),
              const Text(
                "Error loading products",
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF171717),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                e.toString(),
                textAlign: TextAlign.center,
                style:
                    const TextStyle(fontSize: 12, color: Color(0xFF737373)),
              ),
            ],
          ),
        ),
      ),
      data: (products) {
        if (products.isEmpty) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.only(top: 40),
              child: Column(
                children: [
                  const Icon(Icons.inventory_2_outlined,
                      size: 64, color: Color(0xFFA3A3A3)),
                  const SizedBox(height: 16),
                  const Text(
                    "No products found",
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF171717),
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    "Try adjusting your search",
                    style: TextStyle(fontSize: 14, color: Color(0xFF737373)),
                  ),
                ],
              ),
            ),
          );
        }

        return Column(
          children: products.map((p) {
            final qty = getCartQtyFromCart(cart, p.id);

            return Container(
              margin: const EdgeInsets.only(bottom: 12),
              child: DiyaCard(
                padding: const EdgeInsets.all(16),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Fixed image area
                    Container(
                      width: 100,
                      height: 100,
                      decoration: BoxDecoration(
                        color: const Color(0xFFF5F5F5),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: (p.imageUrl == null || p.imageUrl!.isEmpty)
                          ? const Center(
                              child: Icon(
                                Icons.image_outlined,
                                size: 32,
                                color: Color(0xFFA3A3A3),
                              ),
                            )
                          : ClipRRect(
                              borderRadius: BorderRadius.circular(12),
                              child: Image.network(
                                p.imageUrl!,
                                fit: BoxFit.cover,
                                errorBuilder: (context, error, stackTrace) =>
                                    const Center(
                                  child: Icon(
                                    Icons.image_outlined,
                                    size: 32,
                                    color: Color(0xFFA3A3A3),
                                  ),
                                ),
                              ),
                            ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Product name (max 2 lines)
                          Text(
                            p.name,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontWeight: FontWeight.w900,
                              fontSize: 15,
                              color: Color(0xFF171717),
                            ),
                          ),
                          // SKU
                          if (p.sku.isNotEmpty) ...[
                            const SizedBox(height: 4),
                            Text(
                              "SKU: ${p.sku}",
                              style: const TextStyle(
                                fontSize: 11,
                                color: Color(0xFF737373),
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                          const SizedBox(height: 8),
                          // Price (bold)
                          Text(
                            "₹${p.price.toStringAsFixed(0)}",
                            style: const TextStyle(
                              fontWeight: FontWeight.w900,
                              fontSize: 18,
                              color: Color(0xFF171717),
                            ),
                          ),
                          const SizedBox(height: 4),
                          // Stock/Unit (muted)
                          Row(
                            children: [
                              if (p.stock != null) ...[
                                Text(
                                  "Stock: ${p.stock}",
                                  style: const TextStyle(
                                    fontSize: 12,
                                    color: Color(0xFF737373),
                                  ),
                                ),
                                if (p.unit != null && p.unit!.isNotEmpty)
                                  const Text(" • ",
                                      style: TextStyle(
                                          color: Color(0xFF737373))),
                              ],
                              if (p.unit != null && p.unit!.isNotEmpty)
                                Text(
                                  p.unit!,
                                  style: const TextStyle(
                                    fontSize: 12,
                                    color: Color(0xFF737373),
                                  ),
                                ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          // Add/Quantity control
                          if (qty == 0)
                            GestureDetector(
                              onTap: () async {
                                await ref
                                    .read(cartProvider.notifier)
                                    .addItem(p.id);
                              },
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 16, vertical: 10),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFFFE7D1),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: const Text(
                                  "ADD",
                                  style: TextStyle(
                                    color: Color(0xFFFF7A00),
                                    fontWeight: FontWeight.w900,
                                    fontSize: 12,
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
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  GestureDetector(
                                    onTap: () async {
                                      await ref
                                          .read(cartProvider.notifier)
                                          .setQuantity(p.id, qty - 1);
                                    },
                                    child: const Icon(Icons.remove,
                                        size: 18, color: Colors.white),
                                  ),
                                  const SizedBox(width: 12),
                                  SizedBox(
                                    width: 20,
                                    child: Center(
                                      child: Text(
                                        "$qty",
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w900,
                                          fontSize: 14,
                                          color: Colors.white,
                                        ),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  GestureDetector(
                                    onTap: () async {
                                      await ref
                                          .read(cartProvider.notifier)
                                          .setQuantity(p.id, qty + 1);
                                    },
                                    child: const Icon(Icons.add,
                                        size: 18, color: Colors.white),
                                  ),
                                ],
                              ),
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            );
          }).toList(),
        );
      },
    );
  }

  Widget _Cart({required CartDTO? cart}) {
    if (cart == null || cart.items.isEmpty) {
      return const Padding(
        padding: EdgeInsets.only(top: 50),
        child: Center(
          child: Text(
            "Cart is empty",
            style: TextStyle(color: Color(0xFFA3A3A3)),
          ),
        ),
      );
    }

    final selectedTotals = _calculateSelectedTotals(cart);
    final selectedCount = _selectedProductIds.length;
    final totalItems = cart.items.length;
    final allSelected = selectedCount == totalItems && totalItems > 0;

    return Column(
      children: [
        // Select All row
        Container(
          margin: const EdgeInsets.only(bottom: 12),
          child: DiyaCard(
            padding: const EdgeInsets.all(14),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                GestureDetector(
                  onTap: () => _toggleSelectAll(cart),
                  child: Row(
                    children: [
                      SizedBox(
                        width: 24,
                        height: 24,
                        child: Checkbox(
                          value: allSelected,
                          onChanged: (_) => _toggleSelectAll(cart),
                          activeColor: const Color(0xFFFF7A00),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(4),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      const Text(
                        "Select all",
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 15,
                          color: Color(0xFF171717),
                        ),
                      ),
                    ],
                  ),
                ),
                Text(
                  "Selected $selectedCount of $totalItems",
                  style: const TextStyle(
                    fontSize: 13,
                    color: Color(0xFF737373),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ),

        // Cart items with checkboxes
        ...cart.items.map((item) {
          final pid = item.productId;
          final isSelected =
              pid != null && _selectedProductIds.contains(pid);

          return Container(
            margin: const EdgeInsets.only(bottom: 12),
            child: DiyaCard(
              padding: const EdgeInsets.all(14),
              child: Row(
                children: [
                  // Checkbox
                  SizedBox(
                    width: 24,
                    height: 24,
                    child: Checkbox(
                      value: isSelected,
                      onChanged: (_) {
                        if (pid != null) _toggleItemSelection(pid);
                      },
                      activeColor: const Color(0xFFFF7A00),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  // Product info
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          item.productName,
                          style: const TextStyle(fontWeight: FontWeight.w900),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          "₹${item.price.toStringAsFixed(0)} x ${item.quantity}",
                          style: const TextStyle(
                              fontSize: 12, color: Color(0xFF737373)),
                        ),
                      ],
                    ),
                  ),
                  // Total
                  Text(
                    "₹${item.total.toStringAsFixed(0)}",
                    style: TextStyle(
                      fontWeight: FontWeight.w900,
                      color: isSelected
                          ? const Color(0xFF171717)
                          : const Color(0xFFA3A3A3),
                    ),
                  ),
                ],
              ),
            ),
          );
        }),

        // Totals (only for selected items)
        Container(
          margin: const EdgeInsets.only(top: 8),
          child: DiyaCard(
            padding: const EdgeInsets.all(14),
            child: Column(
              children: [
                _LineRow(
                  label: "Subtotal",
                  value:
                      "₹${selectedTotals['subtotal']!.toStringAsFixed(0)}",
                ),
                const SizedBox(height: 8),
                _LineRow(
                  label: "Tax (5%)",
                  value: "₹${selectedTotals['tax']!.toStringAsFixed(0)}",
                ),
                const SizedBox(height: 12),
                const Divider(color: Color(0xFFE5E5E5)),
                const SizedBox(height: 10),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      "Total",
                      style: TextStyle(
                          fontWeight: FontWeight.w900, fontSize: 16),
                    ),
                    Text(
                      "₹${selectedTotals['total']!.toStringAsFixed(0)}",
                      style: const TextStyle(
                          fontWeight: FontWeight.w900, fontSize: 16),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                const Text(
                  "Only selected items will be checked out",
                  style: TextStyle(
                    fontSize: 11,
                    color: Color(0xFF737373),
                    fontStyle: FontStyle.italic,
                  ),
                ),
              ],
            ),
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
