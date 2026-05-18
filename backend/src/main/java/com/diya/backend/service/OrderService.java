package com.diya.backend.service;

import com.diya.backend.dto.OrderCheckoutRequest;
import com.diya.backend.dto.OrderCheckoutResponse;
import com.diya.backend.dto.order.OrderListItemDTO;
import com.diya.backend.dto.order.RetailerOrderDetailDTO;
import com.diya.backend.dto.order.WholesalerOrderDetailDTO;
import com.diya.backend.dto.order.WholesalerOrderItemDetailDTO;
import com.diya.backend.dto.order.WholesalerOrderAcceptRequest;
import com.diya.backend.dto.order.WholesalerOrderEditRequest;
import com.diya.backend.dto.order.WholesalerOrderCreditPatchRequest;
import com.diya.backend.dto.order.WholesalerCreateOrderRequest;
import com.diya.backend.dto.retailer.RetailerCreditSummaryDTO;
import com.diya.backend.entity.*;
import com.diya.backend.repository.*;
import com.diya.backend.util.OrderPrefixUtil;
import com.diya.backend.util.RegionCatalog;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class OrderService {

    private static final BigDecimal GST_RATE = new BigDecimal("0.05");
    private static final BigDecimal DELIVERY_CHARGE = new BigDecimal("50.00");
    private static final int SCALE = 2;
    private static final RoundingMode ROUNDING = RoundingMode.HALF_UP;

    private final OrderRepository orderRepository;
    private final WholesalerRepository wholesalerRepository;
    private final RetailerRepository retailerRepository;
    private final ProductRepository productRepository;
    private final OrderItemRepository orderItemRepository;
    private final CartItemRepository cartItemRepository;
    private final CartRepository cartRepository;
    private final UserRepository userRepository;
    private final ConnectionService connectionService;
    private final PaymentRepository paymentRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final com.diya.backend.repository.InvoiceRepository invoiceRepository;
    private final PaymentService paymentService;
    private final KhatabookService khatabookService;

    // ==========================================================
    // RETAILER: Checkout from Cart -> Create Order
    // ==========================================================
    @Transactional
    public OrderCheckoutResponse checkoutFromCart(String identifier, OrderCheckoutRequest req) {

        // 1) Resolve user -> retailer
        User user = identifier.contains("@")
                ? userRepository.findByEmail(identifier).orElseThrow(() -> new RuntimeException("User not found"))
                : userRepository.findByPhone(identifier).orElseThrow(() -> new RuntimeException("User not found"));

        Retailer retailer = retailerRepository.findByUserId(user.getId())
                .orElseThrow(() -> new RuntimeException("Retailer profile not found"));

        // 2) Resolve wholesaler
        UUID wholesalerId = UUID.fromString(req.getWholesalerId());
        Wholesaler wholesaler = wholesalerRepository.findById(wholesalerId)
                .orElseThrow(() -> new RuntimeException("Wholesaler not found"));

        // 3) Gatekeeping: must be connected
        connectionService.ensureRetailerConnectedToWholesaler(retailer, wholesaler);

        // 4) Load cart
        Cart cart = cartRepository.findByRetailerAndWholesaler(retailer, wholesaler)
                .orElseThrow(() -> new RuntimeException("Cart is empty"));

        if (cart.getItems() == null || cart.getItems().isEmpty()) {
            throw new RuntimeException("Cart has no items");
        }

        // 5) Determine items to checkout (selected checkout supported)
        final java.util.Set<UUID> selectedSet = new java.util.HashSet<>();
        final java.util.List<CartItem> itemsToCheckout;

        if (req.getSelectedProductIds() == null || req.getSelectedProductIds().isEmpty()) {
            // Backward compatible: checkout ALL cart items
            for (CartItem ci : cart.getItems()) {
                selectedSet.add(ci.getProduct().getId());
            }
            itemsToCheckout = new java.util.ArrayList<>(cart.getItems());
        } else {
            for (String pid : req.getSelectedProductIds()) {
                try {
                    selectedSet.add(UUID.fromString(pid));
                } catch (Exception e) {
                    throw new RuntimeException("Invalid selected items");
                }
            }

            // Optional strictness: ensure all selected IDs exist in cart
            java.util.Set<UUID> cartProductIds = new java.util.HashSet<>();
            for (CartItem ci : cart.getItems()) {
                cartProductIds.add(ci.getProduct().getId());
            }
            if (!cartProductIds.containsAll(selectedSet)) {
                throw new RuntimeException("Invalid selected items");
            }

            itemsToCheckout = cart.getItems().stream()
                    .filter(ci -> selectedSet.contains(ci.getProduct().getId()))
                    .toList();

            if (itemsToCheckout.isEmpty()) {
                throw new RuntimeException("No selected items found in cart");
            }
        }

        // 5) Validate items + totals (use product DB values for snapshot)
        BigDecimal subtotal = BigDecimal.ZERO;

        for (CartItem ci : itemsToCheckout) {
            Product p = productRepository.findById(ci.getProduct().getId())
                    .orElseThrow(() -> new RuntimeException("Product not found"));

            int qty = ci.getQuantity();
            if (qty <= 0) {
                throw new RuntimeException("Invalid qty for product: " + p.getName());
            }

            // Note: allow ordering beyond available stock (partial reservation happens later)
            BigDecimal unitPrice = p.getPrice() != null ? p.getPrice() : BigDecimal.ZERO;
            BigDecimal lineTotal = unitPrice.multiply(BigDecimal.valueOf(qty)).setScale(SCALE, ROUNDING);
            subtotal = subtotal.add(lineTotal);
        }

        BigDecimal tax = subtotal.multiply(GST_RATE).setScale(SCALE, ROUNDING);
        BigDecimal total = subtotal.add(tax).add(DELIVERY_CHARGE).setScale(SCALE, ROUNDING);

        // 6) Create base order
        Order order = Order.builder()
                .wholesaler(wholesaler)
                .retailer(retailer)
                .orderNumber("TEMP") // will update after saving
                .status(Order.Status.PLACED)
                .paymentStatus(Order.PaymentStatus.UNPAID)
                .placedAt(LocalDateTime.now())
                .subtotal(subtotal)
                .taxAmount(tax)
                .deliveryCharge(DELIVERY_CHARGE)
                .totalAmount(total)
                .build();

        order = orderRepository.save(order);

        // 7) Create OrderItems + reserve stock
        for (CartItem ci : itemsToCheckout) {

            Product p = productRepository.findById(ci.getProduct().getId())
                    .orElseThrow(() -> new RuntimeException("Product not found"));

            int qty = ci.getQuantity();

            // Stock in Diya is treated as BASE units for invoice/Tally consistency.
            // Order qty is in selling units, so convert using unitsPerSelling (default 1).
            int unitsPerSelling = (p.getUnitsPerSelling() != null && p.getUnitsPerSelling() > 0)
                    ? p.getUnitsPerSelling()
                    : 1;
            int qtyBase = Math.max(0, qty * unitsPerSelling);

            int stock = p.getStock() == null ? 0 : p.getStock();
            int reserved = p.getReservedStock() == null ? 0 : p.getReservedStock();
            int available = Math.max(0, stock - reserved);

            BigDecimal unitPrice = p.getPrice() != null ? p.getPrice() : BigDecimal.ZERO;
            BigDecimal lineTotal = unitPrice.multiply(BigDecimal.valueOf(qty)).setScale(SCALE, ROUNDING);

            // ✅ Handle null/empty unit - default to "pcs" if null or empty
            String unitSnapshot = (p.getUnit() == null || p.getUnit().trim().isEmpty())
                    ? "pcs"
                    : p.getUnit().trim();

            // ✅ Snapshot fields
            OrderItem oi = OrderItem.builder()
                    .order(order)
                    .product(p)
                    .productIdSnapshot(p.getId())
                    .productNameSnapshot(p.getName())
                    .unitSnapshot(unitSnapshot)
                    .qty(qty)
                    .unitPriceSnapshot(unitPrice)
                    .lineTotal(lineTotal)
                    .build();

            orderItemRepository.save(oi);

            // reserve stock (partial reservation allowed) — in BASE units
            int reserveQtyBase = Math.min(qtyBase, available);
            p.setReservedStock(reserved + reserveQtyBase);
            productRepository.save(p);
        }

        // 8) Generate order number
        int nextSeq = Optional.ofNullable(wholesaler.getOrderSequence()).orElse(0) + 1;
        String prefix = OrderPrefixUtil.buildPrefix(wholesaler);
        String orderNum = OrderPrefixUtil.formatOrderNumber(prefix, nextSeq);

        order.setOrderNumber(orderNum);
        orderRepository.save(order);

        wholesaler.setOrderSequence(nextSeq);
        wholesalerRepository.save(wholesaler);

        // 9) Clear cart
        for (CartItem ci : itemsToCheckout) {
            cartItemRepository.delete(ci);
        }
        cart.getItems().removeIf(ci -> selectedSet.contains(ci.getProduct().getId()));
        cartRepository.save(cart);

        return OrderCheckoutResponse.builder()
                .orderId(order.getId())
                .orderNumber(orderNum)
                .totalAmount(total)
                .message("Order placed successfully")
                .build();
    }

    // ==========================================================
    // WHOLESALER: View Orders (simple list)
    // ==========================================================
    public List<OrderListItemDTO> getOrdersForWholesaler(
            String identifier,
            String authType,
            String status,
            String search,
            String dateRange,
            String region,
            java.util.UUID retailerId,
            Integer page,
            Integer size) {

        // resolve wholesaler
        Wholesaler wholesaler;
        if ("EMAIL".equalsIgnoreCase(authType)) {
            wholesaler = wholesalerRepository.findByUserEmail(identifier)
                    .orElseThrow(() -> new RuntimeException("Wholesaler not found"));
        } else {
            wholesaler = wholesalerRepository.findByUserPhone(identifier)
                    .orElseThrow(() -> new RuntimeException("Wholesaler not found"));
        }

        List<Order> orders = orderRepository.findByWholesaler(wholesaler);

        if (retailerId != null) {
            orders = orders.stream()
                    .filter(o -> o.getRetailer() != null && retailerId.equals(o.getRetailer().getId()))
                    .toList();
        }

        // status filter
        if (status != null && !status.isBlank() && !"all".equalsIgnoreCase(status)) {
            String st = status.trim();
            // "Delivered" filter should include all post-delivery stages (e.g. COMPLETED/INVOICED).
            if ("DELIVERED".equalsIgnoreCase(st)) {
                java.util.Set<Order.Status> deliveredOrLater = java.util.EnumSet.of(
                        Order.Status.DELIVERED,
                        Order.Status.COMPLETED,
                        Order.Status.INVOICED
                );
                orders = orders.stream()
                        .filter(o -> o.getStatus() != null && deliveredOrLater.contains(o.getStatus()))
                        .toList();
            } else {
                orders = orders.stream()
                        .filter(o -> o.getStatus() != null && o.getStatus().name().equalsIgnoreCase(st))
                        .toList();
            }
        }

        // search filter
        if (search != null && !search.isBlank()) {
            String q = search.toLowerCase();
            orders = orders.stream()
                    .filter(o -> {
                        String rn = "";
                        if (o.getRetailer() != null) {
                            Retailer r = o.getRetailer();
                            String shop = r.getShopName() != null ? r.getShopName().toLowerCase() : "";
                            String user = (r.getUser() != null && r.getUser().getName() != null) ? r.getUser().getName().toLowerCase() : "";
                            rn = (shop + " " + user).trim();
                        }
                        String on = o.getOrderNumber() != null ? o.getOrderNumber().toLowerCase() : "";
                        return rn.contains(q) || on.contains(q);
                    })
                    .toList();
        }

        // date filter
        if (dateRange != null && !dateRange.isBlank()) {
            LocalDate today = LocalDate.now();
            switch (dateRange.toLowerCase()) {
                case "today" -> orders = orders.stream()
                        .filter(o -> o.getPlacedAt() != null && o.getPlacedAt().toLocalDate().isEqual(today))
                        .toList();
                case "week" -> orders = orders.stream()
                        .filter(o -> o.getPlacedAt() != null
                                && o.getPlacedAt().toLocalDate().isAfter(today.minusDays(7)))
                        .toList();
                case "month" -> orders = orders.stream()
                        .filter(o -> o.getPlacedAt() != null
                                && o.getPlacedAt().toLocalDate().isAfter(today.minusDays(30)))
                        .toList();
                default -> {
                }
            }
        }

        // Retailer territory filter (must run before pagination so pages are stable)
        if (region != null && !region.isBlank()) {
            String want = RegionCatalog.normalize(region);
            if (!want.isEmpty()) {
                orders = orders.stream()
                        .filter(o -> o.getRetailer() != null
                                && want.equals(RegionCatalog.normalize(o.getRetailer().getRegion())))
                        .toList();
            }
        }

        // ✅ Always show latest orders first (createdAt/placedAt DESC)
        orders = orders.stream()
                .sorted((a, b) -> {
                    LocalDateTime da = a.getPlacedAt();
                    LocalDateTime db = b.getPlacedAt();
                    if (da == null && db == null) return 0;
                    if (da == null) return 1;
                    if (db == null) return -1;
                    return db.compareTo(da);
                })
                .toList();

        // Precompute confirmed paid by order for unpaidAmount and overdue checks
        Map<UUID, BigDecimal> paidByOrderId = new HashMap<>();
        for (Payment p : paymentRepository.findByWholesaler(wholesaler)) {
            if (p == null || p.getOrder() == null || p.getOrder().getId() == null) continue;
            if (p.getStatus() != Payment.PaymentStatus.CONFIRMED) continue;
            BigDecimal amt = p.getAmount() != null ? p.getAmount() : BigDecimal.ZERO;
            paidByOrderId.merge(p.getOrder().getId(), amt, BigDecimal::add);
        }

        // pagination (simple slice)
        if (page != null && size != null) {
            int from = page * size;
            int to = Math.min(from + size, orders.size());
            if (from > orders.size())
                orders = List.of();
            else
                orders = orders.subList(from, to);
        }

        return orders.stream().map(o -> {
            int itemCount = o.getOrderItems() == null ? 0 : o.getOrderItems().size();

            String loc = "";
            String retailerRegion = null;
            String retailerDisplayName = "Retailer";
            if (o.getRetailer() != null) {
                Retailer r = o.getRetailer();
                retailerRegion = r.getRegion();
                String city = r.getCity() != null ? r.getCity() : "";
                String state = r.getState() != null ? r.getState() : "";
                loc = (city + (city.isEmpty() || state.isEmpty() ? "" : ", ") + state).trim();

                String n1 = (r.getUser() != null && r.getUser().getName() != null) ? r.getUser().getName().trim() : "";
                String n2 = r.getShopName() != null ? r.getShopName().trim() : "";
                String n3 = r.getContactName() != null ? r.getContactName().trim() : "";
                // Prefer shopName in wholesaler views.
                if (!n2.isBlank()) retailerDisplayName = n2;
                else if (!n1.isBlank()) retailerDisplayName = n1;
                else if (!n3.isBlank()) retailerDisplayName = n3;
            }

            BigDecimal total = o.getTotalAmount() != null ? o.getTotalAmount() : BigDecimal.ZERO;
            BigDecimal paid = paidByOrderId.getOrDefault(o.getId(), BigDecimal.ZERO);
            BigDecimal unpaid = total.subtract(paid).max(BigDecimal.ZERO);
            if (o.getStatus() == Order.Status.PLACED || o.getStatus() == Order.Status.REJECTED || o.getStatus() == Order.Status.CANCELLED) {
                unpaid = BigDecimal.ZERO;
            }

            Integer cd = o.getCreditDays() != null ? o.getCreditDays() : 0;
            LocalDateTime placed = o.getPlacedAt();
            LocalDateTime effDue = (placed != null && cd > 0) ? placed.plusDays(cd) : o.getDueDate();

            return OrderListItemDTO.builder()
                    .id(o.getId().toString())
                    .orderNumber(o.getOrderNumber())
                    .retailerId(o.getRetailer() != null && o.getRetailer().getId() != null ? o.getRetailer().getId().toString() : null)
                    .retailer(retailerDisplayName)
                    .location(loc)
                    .region(retailerRegion)
                    .amount(o.getTotalAmount() == null ? BigDecimal.ZERO : o.getTotalAmount())
                    .date(o.getPlacedAt() == null ? "" : o.getPlacedAt().toString())
                    .createdAt(o.getPlacedAt() == null ? "" : o.getPlacedAt().toString())
                    .status(o.getStatus() == null ? Order.Status.PLACED.name() : o.getStatus().name())
                    .items(itemCount)
                    .exposure("NORMAL")
                    .dueDate(effDue != null ? effDue.toString() : null)
                    .unpaidAmount(unpaid)
                    .build();
        }).toList();
    }

    /**
     * Recompute reservedStock for a set of products from scratch based on all PLACED orders
     * (in placedAt order) for the wholesaler.
     *
     * This keeps partial-reservation semantics intact (reserve up to available at the time),
     * and fixes cases where an edited order would otherwise leave stale reservations behind.
     */
    private void recomputeReservationsForProducts(Wholesaler wholesaler, java.util.Set<java.util.UUID> productIds) {
        if (wholesaler == null || wholesaler.getId() == null) return;
        if (productIds == null || productIds.isEmpty()) return;

        java.util.List<Product> products = productRepository.findAllById(productIds);
        java.util.Map<java.util.UUID, Product> productById = new java.util.HashMap<>();
        for (Product p : products) {
            if (p == null || p.getId() == null) continue;
            p.setReservedStock(0);
            productById.put(p.getId(), p);
        }
        productRepository.saveAll(productById.values());

        java.util.List<Order> open = orderRepository.findByWholesaler(wholesaler).stream()
                .filter(o -> o != null && o.getStatus() == Order.Status.PLACED)
                .sorted(java.util.Comparator.comparing(
                        (Order o) -> o.getPlacedAt() == null ? java.time.LocalDateTime.MIN : o.getPlacedAt()
                ))
                .toList();

        java.util.Map<java.util.UUID, Integer> reservedByProductId = new java.util.HashMap<>();
        for (java.util.UUID pid : productById.keySet()) {
            reservedByProductId.put(pid, 0);
        }

        for (Order o : open) {
            if (o.getOrderItems() == null) continue;
            for (OrderItem item : o.getOrderItems()) {
                if (item == null) continue;
                java.util.UUID pid = null;
                if (item.getProduct() != null && item.getProduct().getId() != null) {
                    pid = item.getProduct().getId();
                } else if (item.getProductIdSnapshot() != null) {
                    pid = item.getProductIdSnapshot();
                }
                if (pid == null || !productById.containsKey(pid)) continue;

                Product tracked = productById.get(pid);
                int stock = tracked.getStock() == null ? 0 : Math.max(0, tracked.getStock());
                int reservedSoFar = reservedByProductId.getOrDefault(pid, 0);
                int available = Math.max(0, stock - reservedSoFar);

                int qty = item.getQty() == null ? 0 : item.getQty();
                int unitsPerSelling = (tracked.getUnitsPerSelling() != null && tracked.getUnitsPerSelling() > 0)
                        ? tracked.getUnitsPerSelling()
                        : 1;
                long qtyBaseLong = (long) qty * (long) unitsPerSelling;
                if (qtyBaseLong < 0) qtyBaseLong = 0;
                if (qtyBaseLong > Integer.MAX_VALUE) qtyBaseLong = Integer.MAX_VALUE;
                int qtyBase = (int) qtyBaseLong;

                int reserveQtyBase = Math.min(qtyBase, available);
                long nextLong = (long) reservedSoFar + (long) reserveQtyBase;
                int nextReserved = nextLong > Integer.MAX_VALUE ? Integer.MAX_VALUE : (int) nextLong;

                reservedByProductId.put(pid, nextReserved);
                tracked.setReservedStock(nextReserved);
            }
        }

        productRepository.saveAll(productById.values());
    }

    /**
     * Rebuilds {@link Product#getReservedStock()} for every product owned by the wholesaler from all PLACED orders.
     * Corrects stale/corrupted reservation totals (e.g. after bad quantities or partial Hibernate state).
     */
    private void reconcileReservedStockForWholesaler(Wholesaler wholesaler) {
        if (wholesaler == null || wholesaler.getId() == null) return;
        java.util.List<Product> all = productRepository.findByWholesalerId(wholesaler.getId());
        java.util.Set<java.util.UUID> ids = new java.util.HashSet<>();
        for (Product p : all) {
            if (p != null && p.getId() != null) {
                ids.add(p.getId());
            }
        }
        recomputeReservationsForProducts(wholesaler, ids);
    }

    // ==========================================================
    // WHOLESALER: Direct create order for a retailer
    // ==========================================================
    @Transactional
    public Order createOrderForWholesaler(String identifier, WholesalerCreateOrderRequest req) {
        if (req == null || req.getRetailerId() == null || req.getItems() == null || req.getItems().isEmpty()) {
            throw new RuntimeException("Retailer and at least one item are required");
        }

        Wholesaler wholesaler = identifier.contains("@")
                ? wholesalerRepository.findByUserEmail(identifier)
                        .orElseThrow(() -> new RuntimeException("Wholesaler not found"))
                : wholesalerRepository.findByUserPhone(identifier)
                        .orElseThrow(() -> new RuntimeException("Wholesaler not found"));

        Retailer retailer = retailerRepository.findById(req.getRetailerId())
                .orElseThrow(() -> new RuntimeException("Retailer not found"));

        // Ensure connection between wholesaler and retailer exists
        connectionService.ensureRetailerConnectedToWholesaler(retailer, wholesaler);

        BigDecimal subtotal = BigDecimal.ZERO;

        java.util.List<WholesalerCreateOrderRequest.Item> items = req.getItems();
        if (items == null || items.isEmpty()) {
            throw new RuntimeException("At least one item is required");
        }

        // Pre-validate items and compute subtotal
        final long MAX_ORDER_QTY_PER_LINE = 100000L;
        for (WholesalerCreateOrderRequest.Item item : items) {
            if (item == null || item.getProductId() == null) {
                throw new RuntimeException("productId is required for each item");
            }
            if (item.getQuantity() == null || item.getQuantity() <= 0) {
                throw new RuntimeException("Quantity must be > 0 for each item");
            }

            Product p = productRepository.findById(item.getProductId())
                    .orElseThrow(() -> new RuntimeException("Product not found: " + item.getProductId()));

            long qtyLong = item.getQuantity();
            if (qtyLong > MAX_ORDER_QTY_PER_LINE) {
                throw new RuntimeException("Quantity too large (max " + MAX_ORDER_QTY_PER_LINE + ") for product: " + p.getName());
            }
            if (qtyLong > Integer.MAX_VALUE) {
                throw new RuntimeException("Quantity too large for product: " + p.getName());
            }
            int qty = (int) qtyLong;
            BigDecimal unitPrice = p.getPrice() != null ? p.getPrice() : BigDecimal.ZERO;
            BigDecimal lineTotal = unitPrice
                    .multiply(BigDecimal.valueOf(qty))
                    .setScale(SCALE, ROUNDING);
            subtotal = subtotal.add(lineTotal);
        }

        subtotal = subtotal.setScale(SCALE, ROUNDING);
        BigDecimal tax = subtotal.multiply(GST_RATE).setScale(SCALE, ROUNDING);
        BigDecimal total = subtotal.add(tax).add(DELIVERY_CHARGE).setScale(SCALE, ROUNDING);

        Order order = Order.builder()
                .wholesaler(wholesaler)
                .retailer(retailer)
                .orderNumber("TEMP")
                .status(Order.Status.PLACED)
                .paymentStatus(Order.PaymentStatus.UNPAID)
                .placedAt(LocalDateTime.now())
                .subtotal(subtotal)
                .taxAmount(tax)
                .deliveryCharge(DELIVERY_CHARGE)
                .totalAmount(total)
                .build();

        order = orderRepository.save(order);

        for (WholesalerCreateOrderRequest.Item item : items) {
            Product p = productRepository.findById(item.getProductId())
                    .orElseThrow(() -> new RuntimeException("Product not found: " + item.getProductId()));

            long qtyLong = item.getQuantity() == null ? 0L : item.getQuantity();
            if (qtyLong <= 0) {
                throw new RuntimeException("Quantity must be > 0 for each item");
            }
            if (qtyLong > MAX_ORDER_QTY_PER_LINE) {
                throw new RuntimeException("Quantity too large (max " + MAX_ORDER_QTY_PER_LINE + ") for product: " + p.getName());
            }
            if (qtyLong > Integer.MAX_VALUE) {
                throw new RuntimeException("Quantity too large for product: " + p.getName());
            }
            int qty = (int) qtyLong;

            // Stock in Diya is treated as BASE units for invoice/Tally consistency.
            // Order qty is in selling units, so convert using unitsPerSelling (default 1).
            int unitsPerSelling = (p.getUnitsPerSelling() != null && p.getUnitsPerSelling() > 0)
                    ? p.getUnitsPerSelling()
                    : 1;
            int qtyBase = Math.max(0, qty * unitsPerSelling);

            int stock = p.getStock() == null ? 0 : p.getStock();
            int reserved = p.getReservedStock() == null ? 0 : p.getReservedStock();
            int available = Math.max(0, stock - reserved);

            BigDecimal unitPrice = p.getPrice() != null ? p.getPrice() : BigDecimal.ZERO;
            BigDecimal lineTotal = unitPrice.multiply(BigDecimal.valueOf(qty)).setScale(SCALE, ROUNDING);

            String unitSnapshot = (p.getUnit() == null || p.getUnit().trim().isEmpty())
                    ? "pcs"
                    : p.getUnit().trim();

            OrderItem oi = OrderItem.builder()
                    .order(order)
                    .product(p)
                    .productIdSnapshot(p.getId())
                    .productNameSnapshot(p.getName())
                    .unitSnapshot(unitSnapshot)
                    .qty(qty)
                    .unitPriceSnapshot(unitPrice)
                    .lineTotal(lineTotal)
                    .build();

            orderItemRepository.save(oi);

            int reserveQtyBase = Math.min(qtyBase, available);
            p.setReservedStock(reserved + reserveQtyBase);
            productRepository.save(p);
        }

        int nextSeq = Optional.ofNullable(wholesaler.getOrderSequence()).orElse(0) + 1;
        String prefix = OrderPrefixUtil.buildPrefix(wholesaler);
        String orderNum = OrderPrefixUtil.formatOrderNumber(prefix, nextSeq);

        order.setOrderNumber(orderNum);
        orderRepository.save(order);

        wholesaler.setOrderSequence(nextSeq);
        wholesalerRepository.save(wholesaler);

        reconcileReservedStockForWholesaler(wholesaler);

        return order;
    }

    // ==========================================================
    // RETAILER: Orders list
    // ==========================================================
    public List<OrderListItemDTO> getOrdersForRetailer(String identifier) {

        Retailer retailer;
        if (identifier != null && identifier.contains("@")) {
            retailer = retailerRepository.findByUserEmail(identifier).orElse(null);
        } else {
            retailer = retailerRepository.findByPhoneContact(identifier)
                    .orElseGet(() -> retailerRepository.findByUserPhone(identifier).orElse(null));
        }
        if (retailer == null) {
            throw new RuntimeException("Retailer not found");
        }

        List<Order> orders = orderRepository.findByRetailer(retailer);

        Map<UUID, BigDecimal> paidByOrderId = new HashMap<>();
        for (Payment p : paymentRepository.findByRetailerOrderByCreatedAtDesc(retailer)) {
            if (p == null || p.getOrder() == null || p.getOrder().getId() == null) continue;
            if (p.getStatus() != Payment.PaymentStatus.CONFIRMED) continue;
            BigDecimal amt = p.getAmount() != null ? p.getAmount() : BigDecimal.ZERO;
            paidByOrderId.merge(p.getOrder().getId(), amt, BigDecimal::add);
        }

        return orders.stream().map(o -> {
            int itemCount = o.getOrderItems() == null ? 0 : o.getOrderItems().size();
            OrderPaymentSummary summary = computeOrderPaymentSummary(o, paidByOrderId);

            return OrderListItemDTO.builder()
                    .id(o.getId().toString())
                    .orderNumber(o.getOrderNumber())
                    .retailer(retailer.getUser().getName())
                    .location(retailer.getCity() + ", " + retailer.getState())
                    .amount(o.getTotalAmount() == null ? BigDecimal.ZERO : o.getTotalAmount())
                    .date(o.getPlacedAt() == null ? "" : o.getPlacedAt().toString())
                    .status(o.getStatus() == null ? Order.Status.PLACED.name() : o.getStatus().name())
                    .items(itemCount)
                    .exposure("NORMAL")
                    .paidAmount(summary.paidAmount())
                    .unpaidAmount(summary.outstandingAmount())
                    .paymentStatus(summary.displayPaymentStatus())
                    .build();
        }).toList();
    }

    // ==========================================================
    // RETAILER: Order detail
    // ==========================================================
    public RetailerOrderDetailDTO getRetailerOrderDetailDto(String identifier, UUID orderId) {
        Order order = getRetailerOrderEntity(identifier, orderId);
        OrderPaymentSummary summary = computeOrderPaymentSummary(order, null);

        java.util.List<RetailerOrderDetailDTO.PaymentHistoryDTO> paymentHistory = new java.util.ArrayList<>();
        try {
            java.util.List<Payment> payments = paymentRepository.findByOrder(order);
            if (payments != null) {
                payments = payments.stream()
                        .sorted(java.util.Comparator.comparing(
                                p -> p.getConfirmedAt() != null ? p.getConfirmedAt() : p.getCreatedAt(),
                                java.util.Comparator.nullsLast(java.util.Comparator.naturalOrder())))
                        .toList();
                for (Payment pay : payments) {
                    if (pay == null) continue;
                    paymentHistory.add(RetailerOrderDetailDTO.PaymentHistoryDTO.builder()
                            .amount(pay.getAmount() == null ? BigDecimal.ZERO : pay.getAmount())
                            .paymentMethod(pay.getMode() != null ? pay.getMode().name() : null)
                            .status(pay.getStatus() != null ? pay.getStatus().name() : null)
                            .createdAt(pay.getConfirmedAt() != null ? pay.getConfirmedAt() : pay.getCreatedAt())
                            .build());
                }
            }
        } catch (Exception ignored) {
        }

        Wholesaler w = order.getWholesaler();
        RetailerOrderDetailDTO.WholesalerDTO wholesalerDto = null;
        if (w != null) {
            wholesalerDto = RetailerOrderDetailDTO.WholesalerDTO.builder()
                    .id(w.getId())
                    .businessName(w.getBusinessName())
                    .city(w.getCity())
                    .state(w.getState())
                    .build();
        }

        List<RetailerOrderDetailDTO.OrderItemDTO> items = new ArrayList<>();
        if (order.getOrderItems() != null) {
            for (OrderItem oi : order.getOrderItems()) {
                items.add(RetailerOrderDetailDTO.OrderItemDTO.builder()
                        .id(oi.getId())
                        .productNameSnapshot(oi.getProductNameSnapshot())
                        .qty(oi.getQty())
                        .unitPriceSnapshot(oi.getUnitPriceSnapshot())
                        .lineTotal(oi.getLineTotal())
                        .originalQty(oi.getOriginalQty())
                        .originalUnitPrice(oi.getOriginalUnitPrice())
                        .originalLineTotal(oi.getOriginalLineTotal())
                        .build());
            }
        }

        Integer cd = order.getCreditDays() != null ? order.getCreditDays() : 0;
        LocalDateTime placed = order.getPlacedAt();
        LocalDateTime displayDue = (placed != null && cd > 0)
                ? placed.plusDays(cd)
                : (order.getDueDate() != null ? order.getDueDate() : null);
        boolean isOverdue = displayDue != null
                && LocalDateTime.now().isAfter(displayDue)
                && summary.outstandingAmount().compareTo(BigDecimal.ZERO) > 0;

        return RetailerOrderDetailDTO.builder()
                .id(order.getId())
                .orderNumber(order.getOrderNumber())
                .status(order.getStatus() != null ? order.getStatus().name() : null)
                .paymentStatus(summary.displayPaymentStatus())
                .paymentMode(order.getPaymentMode() != null ? order.getPaymentMode().name() : null)
                .creditDays(cd)
                .dueDate(displayDue)
                .isOverdue(isOverdue)
                .paidAmount(summary.paidAmount())
                .outstandingAmount(summary.outstandingAmount())
                .placedAt(order.getPlacedAt())
                .editedAt(order.getEditedAt())
                .editReason(order.getEditReason())
                .subtotal(order.getSubtotal())
                .taxAmount(order.getTaxAmount())
                .deliveryCharge(order.getDeliveryCharge())
                .totalAmount(order.getTotalAmount())
                .wholesaler(wholesalerDto)
                .orderItems(items)
                .paymentHistory(paymentHistory)
                .build();
    }

    private Order getRetailerOrderEntity(String identifier, UUID orderId) {
        Retailer retailer;
        if (identifier != null && identifier.contains("@")) {
            retailer = retailerRepository.findByUserEmail(identifier).orElse(null);
        } else {
            retailer = retailerRepository.findByPhoneContact(identifier)
                    .orElseGet(() -> retailerRepository.findByUserPhone(identifier).orElse(null));
        }
        if (retailer == null) {
            throw new RuntimeException("Retailer not found");
        }

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        if (!order.getRetailer().getId().equals(retailer.getId())) {
            throw new RuntimeException("Access denied: Order not linked to this retailer");
        }

        return order;
    }

    private record OrderPaymentSummary(
            BigDecimal paidAmount,
            BigDecimal outstandingAmount,
            String displayPaymentStatus) {
    }

    private OrderPaymentSummary computeOrderPaymentSummary(Order order, Map<UUID, BigDecimal> paidByOrderId) {
        BigDecimal paidAmount = BigDecimal.ZERO;
        if (paidByOrderId != null && order.getId() != null) {
            paidAmount = paidByOrderId.getOrDefault(order.getId(), BigDecimal.ZERO);
        } else {
            try {
                List<Payment> payments = paymentRepository.findByOrder(order);
                if (payments != null) {
                    for (Payment pay : payments) {
                        if (pay == null || pay.getStatus() != Payment.PaymentStatus.CONFIRMED) continue;
                        paidAmount = paidAmount.add(pay.getAmount() == null ? BigDecimal.ZERO : pay.getAmount());
                    }
                }
            } catch (Exception ignored) {
            }
        }

        BigDecimal total = order.getTotalAmount() == null ? BigDecimal.ZERO : order.getTotalAmount();
        BigDecimal outstanding = total.subtract(paidAmount).max(BigDecimal.ZERO);
        if (order.getStatus() == Order.Status.PLACED
                || order.getStatus() == Order.Status.REJECTED
                || order.getStatus() == Order.Status.CANCELLED) {
            outstanding = BigDecimal.ZERO;
        }

        String displayPaymentStatus;
        if (outstanding.compareTo(BigDecimal.ZERO) <= 0) {
            displayPaymentStatus = paidAmount.compareTo(BigDecimal.ZERO) > 0 ? "PAID" : "UNPAID";
        } else if (paidAmount.compareTo(BigDecimal.ZERO) > 0) {
            displayPaymentStatus = "PARTIAL";
        } else {
            displayPaymentStatus = "UNPAID";
        }

        return new OrderPaymentSummary(paidAmount, outstanding, displayPaymentStatus);
    }

    @Transactional
    public Order retailerCancelOrder(String identifier, UUID orderId) {

        Retailer retailer;
        if (identifier != null && identifier.contains("@")) {
            retailer = retailerRepository.findByUserEmail(identifier).orElse(null);
        } else {
            retailer = retailerRepository.findByPhoneContact(identifier)
                    .orElseGet(() -> retailerRepository.findByUserPhone(identifier).orElse(null));
        }
        if (retailer == null) {
            throw new RuntimeException("Retailer not found");
        }

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        if (!order.getRetailer().getId().equals(retailer.getId())) {
            throw new RuntimeException("Access denied: Order not linked to this retailer");
        }

        // ✅ retailer can cancel only before wholesaler accepts
        if (order.getStatus() != Order.Status.PLACED) {
            throw new RuntimeException("Order cannot be cancelled after wholesaler accepts/rejects");
        }

        order.setStatus(Order.Status.CANCELLED);
        order.setCancelledAt(LocalDateTime.now());

        Order saved = orderRepository.saveAndFlush(order);
        if (saved.getWholesaler() != null) {
            reconcileReservedStockForWholesaler(saved.getWholesaler());
        }
        return saved;
    }

    // ==========================================================
    // WHOLESALER: Get order details
    // ==========================================================
    public Order getWholesalerOrderDetails(String identifier, String authType, UUID orderId) {
        Wholesaler wholesaler;
        if ("EMAIL".equalsIgnoreCase(authType)) {
            wholesaler = wholesalerRepository.findByUserEmail(identifier)
                    .orElseThrow(() -> new RuntimeException("Wholesaler not found"));
        } else {
            wholesaler = wholesalerRepository.findByUserPhone(identifier)
                    .orElseThrow(() -> new RuntimeException("Wholesaler not found"));
        }

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        if (!order.getWholesaler().getId().equals(wholesaler.getId())) {
            throw new RuntimeException("Access denied: Order not linked to this wholesaler");
        }

        return order;
    }

    // ==========================================================
    // WHOLESALER: Order detail DTO (includes stock breakdown)
    // ==========================================================
    public WholesalerOrderDetailDTO getWholesalerOrderDetailDto(String identifier, String authType, UUID orderId) {
        Order order = getWholesalerOrderDetails(identifier, authType, orderId);

        // Refresh reservation totals from persisted PLACED order lines (fixes stale DB + avoids stale entity cache).
        reconcileReservedStockForWholesaler(order.getWholesaler());

        Retailer r = order.getRetailer();
        WholesalerOrderDetailDTO.RetailerDTO retailerDto = null;
        if (r != null) {
            retailerDto = WholesalerOrderDetailDTO.RetailerDTO.builder()
                    .id(r.getId())
                    .name(r.getUser() != null ? r.getUser().getName() : null)
                    .shopName(r.getShopName())
                    .phone(r.getPhoneContact())
                    .address(r.getAddress())
                    .city(r.getCity())
                    .state(r.getState())
                    .build();
        }

        java.util.List<WholesalerOrderItemDetailDTO> items = new java.util.ArrayList<>();
        if (order.getOrderItems() != null) {
            for (OrderItem oi : order.getOrderItems()) {
                Product p = productRepository.findById(oi.getProductIdSnapshot()).orElse(null);
                int stock = p != null && p.getStock() != null ? Math.max(0, p.getStock()) : 0;
                int reserved = p != null && p.getReservedStock() != null ? Math.max(0, p.getReservedStock()) : 0;
                int available = Math.max(0, stock - reserved);

                items.add(WholesalerOrderItemDetailDTO.builder()
                        .orderItemId(oi.getId() != null ? oi.getId().toString() : null)
                        .productNameSnapshot(oi.getProductNameSnapshot())
                        .orderedQty(oi.getQty())
                        .unitSnapshot(oi.getUnitSnapshot())
                        .unitPriceSnapshot(oi.getUnitPriceSnapshot() != null ? oi.getUnitPriceSnapshot().doubleValue() : null)
                        .lineTotal(oi.getLineTotal() != null ? oi.getLineTotal().doubleValue() : null)
                        .currentStock(stock)
                        .currentReservedStock(reserved)
                        .availableStock(available)
                        .build());
            }
        }

        BigDecimal paidAmount = BigDecimal.ZERO;
        java.util.List<WholesalerOrderDetailDTO.PaymentHistoryDTO> paymentHistory = new java.util.ArrayList<>();
        try {
            java.util.List<Payment> payments = paymentRepository.findByOrder(order);
            if (payments != null) {
                payments = payments.stream()
                        .filter(p -> p != null && p.getStatus() == Payment.PaymentStatus.CONFIRMED)
                        .sorted(java.util.Comparator.comparing(p -> (p.getConfirmedAt() != null ? p.getConfirmedAt() : p.getCreatedAt())))
                        .toList();
                for (Payment pay : payments) {
                    paidAmount = paidAmount.add(pay.getAmount() == null ? BigDecimal.ZERO : pay.getAmount());
                    paymentHistory.add(WholesalerOrderDetailDTO.PaymentHistoryDTO.builder()
                            .amount(pay.getAmount() == null ? BigDecimal.ZERO : pay.getAmount())
                            .paymentMethod(pay.getMode() != null ? pay.getMode().name() : null)
                            .createdAt(pay.getConfirmedAt() != null ? pay.getConfirmedAt() : pay.getCreatedAt())
                            .build());
                }
            }
        } catch (Exception ignored) {
        }

        BigDecimal total = order.getTotalAmount() == null ? BigDecimal.ZERO : order.getTotalAmount();
        BigDecimal outstanding = total.subtract(paidAmount).max(BigDecimal.ZERO);
        // Before acceptance (PLACED) or when rejected/cancelled, "outstanding" must be 0.
        if (order.getStatus() == Order.Status.PLACED
                || order.getStatus() == Order.Status.REJECTED
                || order.getStatus() == Order.Status.CANCELLED) {
            outstanding = BigDecimal.ZERO;
        }

        Integer cd = order.getCreditDays() != null ? order.getCreditDays() : 0;
        java.time.LocalDateTime placed = order.getPlacedAt();
        java.time.LocalDateTime displayDue = (placed != null && cd > 0)
                ? placed.plusDays(cd)
                : (order.getDueDate() != null ? order.getDueDate() : null);
        boolean isOverdue = displayDue != null
                && java.time.LocalDateTime.now().isAfter(displayDue)
                && outstanding.compareTo(BigDecimal.ZERO) > 0;

        BigDecimal creditGiven = order.getApprovedCreditAmount() != null
                ? order.getApprovedCreditAmount()
                : BigDecimal.ZERO;

        // Display payment status from order total vs confirmed payments (real-time)
        String displayPaymentStatus;
        if (outstanding.compareTo(BigDecimal.ZERO) <= 0) {
            displayPaymentStatus = "PAID";
        } else if (paidAmount.compareTo(BigDecimal.ZERO) > 0) {
            displayPaymentStatus = "PARTIAL";
        } else {
            displayPaymentStatus = "UNPAID";
        }

        return WholesalerOrderDetailDTO.builder()
                .id(order.getId())
                .orderNumber(order.getOrderNumber())
                .status(order.getStatus() != null ? order.getStatus().name() : null)
                .paymentStatus(displayPaymentStatus)
                .paymentMode(order.getPaymentMode() != null ? order.getPaymentMode().name() : null)
                .creditDays(cd)
                .dueDate(displayDue)
                .isOverdue(isOverdue)
                .paidAmount(paidAmount)
                .outstandingAmount(outstanding)
                .creditGiven(creditGiven)
                .placedAt(order.getPlacedAt())
                .subtotal(order.getSubtotal())
                .taxAmount(order.getTaxAmount())
                .deliveryCharge(order.getDeliveryCharge())
                .totalAmount(order.getTotalAmount())
                .retailer(retailerDto)
                .items(items)
                .invoiceId(invoiceRepository.findByOrderId(order.getId()).map(Invoice::getId).orElse(null))
                .paymentHistory(paymentHistory)
                .build();
    }

    /**
     * Previous due for a retailer = sum(totalAmount - confirmedPaid) across wholesaler's orders
     * where status == ACCEPTED, excluding the current order if provided.
     *
     * This is intentionally strict and order-derived (not ledger-derived) so it updates in real time after payments.
     */
    public BigDecimal getPreviousDueForRetailerAcceptedOnly(
            String identifier,
            String authType,
            UUID retailerId,
            UUID excludeOrderId) {
        Wholesaler wholesaler;
        if ("EMAIL".equalsIgnoreCase(authType)) {
            wholesaler = wholesalerRepository.findByUserEmail(identifier)
                    .orElseThrow(() -> new RuntimeException("Wholesaler not found"));
        } else {
            wholesaler = wholesalerRepository.findByUserPhone(identifier)
                    .orElseThrow(() -> new RuntimeException("Wholesaler not found"));
        }

        BigDecimal previousDue = BigDecimal.ZERO;

        // Precompute paid-by-order from CONFIRMED payments (wholesaler-scoped).
        Map<UUID, BigDecimal> paidByOrderId = new HashMap<>();
        for (Payment p : paymentRepository.findByWholesaler(wholesaler)) {
            if (p == null || p.getOrder() == null || p.getStatus() != Payment.PaymentStatus.CONFIRMED) continue;
            UUID oid = p.getOrder().getId();
            BigDecimal amt = p.getAmount() != null ? p.getAmount() : BigDecimal.ZERO;
            paidByOrderId.merge(oid, amt, BigDecimal::add);
        }

        for (Order o : orderRepository.findByWholesaler(wholesaler)) {
            if (o == null || o.getRetailer() == null || o.getRetailer().getId() == null) continue;
            if (!o.getRetailer().getId().equals(retailerId)) continue;
            if (excludeOrderId != null && excludeOrderId.equals(o.getId())) continue;
            if (o.getStatus() != Order.Status.ACCEPTED) continue;

            BigDecimal total = o.getTotalAmount() != null ? o.getTotalAmount() : BigDecimal.ZERO;
            BigDecimal paid = paidByOrderId.getOrDefault(o.getId(), BigDecimal.ZERO);
            BigDecimal unpaid = total.subtract(paid).max(BigDecimal.ZERO);
            previousDue = previousDue.add(unpaid);
        }

        return previousDue;
    }

    @Transactional
    public WholesalerOrderDetailDTO wholesalerPatchOrderCredit(
            String identifier, String authType, UUID orderId, WholesalerOrderCreditPatchRequest req) {
        if (req == null) {
            throw new RuntimeException("Request body required");
        }
        Wholesaler wholesaler = identifier.contains("@")
                ? wholesalerRepository.findByUserEmail(identifier)
                        .orElseThrow(() -> new RuntimeException("Wholesaler not found"))
                : wholesalerRepository.findByUserPhone(identifier)
                        .orElseThrow(() -> new RuntimeException("Wholesaler not found"));

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));
        if (!order.getWholesaler().getId().equals(wholesaler.getId())) {
            throw new RuntimeException("Access denied");
        }
        if (order.getStatus() == Order.Status.CANCELLED || order.getStatus() == Order.Status.REJECTED) {
            throw new RuntimeException("Cannot edit credit on cancelled or rejected orders");
        }

        if (req.getCreditDays() != null) {
            int d = req.getCreditDays();
            if (d < 0) {
                throw new RuntimeException("creditDays cannot be negative");
            }
            order.setCreditDays(d);
            // Use placedAt when available, else fall back to acceptedAt so legacy rows
            // (or older data) can still compute due dates reliably.
            java.time.LocalDateTime base = order.getPlacedAt() != null
                    ? order.getPlacedAt()
                    : (order.getAcceptedAt() != null ? order.getAcceptedAt() : java.time.LocalDateTime.now());
            if (d > 0) {
                order.setDueDate(base.plusDays(d));
                // Keep creditDueDate aligned when there is any approved credit amount.
                java.math.BigDecimal approved = order.getApprovedCreditAmount() != null ? order.getApprovedCreditAmount() : java.math.BigDecimal.ZERO;
                if (approved.compareTo(java.math.BigDecimal.ZERO) > 0) {
                    order.setCreditDueDate(java.time.LocalDateTime.now().plusDays(d));
                }
            } else {
                order.setDueDate(null);
                order.setCreditDueDate(null);
            }
        }
        if (req.getApprovedCreditAmount() != null) {
            BigDecimal cap = order.getTotalAmount() != null ? order.getTotalAmount() : BigDecimal.ZERO;
            BigDecimal amt = req.getApprovedCreditAmount();
            if (amt.compareTo(BigDecimal.ZERO) < 0) {
                amt = BigDecimal.ZERO;
            }
            if (amt.compareTo(cap) > 0) {
                amt = cap;
            }
            order.setApprovedCreditAmount(amt);
        }

        orderRepository.save(order);
        return getWholesalerOrderDetailDto(identifier, authType, orderId);
    }

    // ==========================================================
    // WHOLESALER: Update status with strict transition rules + stock handling
    // ==========================================================
    @Transactional
    public Order wholesalerUpdateOrderStatus(String identifier, UUID orderId, String newStatus) {

        Wholesaler wholesaler = identifier.contains("@")
                ? wholesalerRepository.findByUserEmail(identifier)
                        .orElseThrow(() -> new RuntimeException("Wholesaler not found"))
                : wholesalerRepository.findByUserPhone(identifier)
                        .orElseThrow(() -> new RuntimeException("Wholesaler not found"));

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        if (!order.getWholesaler().getId().equals(wholesaler.getId())) {
            throw new RuntimeException("Access denied: Order not linked to this wholesaler");
        }

        Order.Status target = Order.Status.valueOf(newStatus.toUpperCase());
        Order.Status current = order.getStatus();

        if (target == Order.Status.ACCEPTED) {
            // Accepting an order requires payment terms and possible immediate payment capture.
            // Enforce using the dedicated /accept endpoint to keep ledger + payments consistent.
            throw new RuntimeException("Use /accept endpoint to accept orders (requires payment terms)");
        }

        // ✅ Allowed transitions
        boolean allowed = (current == Order.Status.PLACED && (target == Order.Status.ACCEPTED
                || target == Order.Status.REJECTED || target == Order.Status.CANCELLED))
                || (current == Order.Status.ACCEPTED && target == Order.Status.PACKING)
                || (current == Order.Status.PACKING && target == Order.Status.DISPATCHED)
                || (current == Order.Status.DISPATCHED && target == Order.Status.DELIVERED)
                || (current == Order.Status.DELIVERED && target == Order.Status.COMPLETED);

        if (!allowed) {
            throw new RuntimeException("Invalid order status transition: " + current + " -> " + target);
        }

        // ✅ Stock actions
        if (target == Order.Status.ACCEPTED) {
            // convert reserved -> stock deduction
            for (OrderItem item : order.getOrderItems()) {
                Product p = item.getProduct();
                int qty = item.getQty();

                if (p == null) {
                    throw new RuntimeException("Product missing for item: " + item.getProductNameSnapshot());
                }

                int unitsPerSelling = (p.getUnitsPerSelling() != null && p.getUnitsPerSelling() > 0)
                        ? p.getUnitsPerSelling()
                        : 1;
                int qtyBase = Math.max(0, qty * unitsPerSelling);

                int reserved = p.getReservedStock() == null ? 0 : p.getReservedStock();
                int stock = p.getStock() == null ? 0 : p.getStock();

                if (reserved < qtyBase) {
                    throw new RuntimeException("Reserved stock mismatch for: " + p.getName());
                }
                if (stock < qtyBase) {
                    throw new RuntimeException("Stock insufficient at acceptance for: " + p.getName());
                }

                p.setReservedStock(reserved - qtyBase);
                p.setStock(stock - qtyBase);
                productRepository.save(p);
            }

            order.setAcceptedAt(LocalDateTime.now());
        }

        if (target == Order.Status.REJECTED || target == Order.Status.CANCELLED) {
            order.setCancelledAt(LocalDateTime.now());
        }

        if (target == Order.Status.DISPATCHED) {
            order.setDispatchedAt(LocalDateTime.now());
        }

        if (target == Order.Status.DELIVERED) {
            order.setDeliveredAt(LocalDateTime.now());
        }

        order.setStatus(target);
        Order saved = orderRepository.saveAndFlush(order);
        if (target == Order.Status.REJECTED || target == Order.Status.CANCELLED) {
            reconcileReservedStockForWholesaler(wholesaler);
        }
        return saved;
    }

    // ==========================================================
    // WHOLESALER: Accept order with optional force
    // ==========================================================
    @Transactional
    public java.util.Map<String, Object> wholesalerAcceptOrder(
            String identifier,
            UUID orderId,
            boolean force,
            boolean forceCredit,
            WholesalerOrderAcceptRequest req) {
        Wholesaler wholesaler = identifier.contains("@")
                ? wholesalerRepository.findByUserEmail(identifier)
                        .orElseThrow(() -> new RuntimeException("Wholesaler not found"))
                : wholesalerRepository.findByUserPhone(identifier)
                        .orElseThrow(() -> new RuntimeException("Wholesaler not found"));

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        if (!order.getWholesaler().getId().equals(wholesaler.getId())) {
            throw new RuntimeException("Access denied: Order not linked to this wholesaler");
        }

        if (order.getStatus() != Order.Status.PLACED) {
            throw new RuntimeException("Only PLACED orders can be accepted");
        }

        java.util.List<String> warnings = new java.util.ArrayList<>();

        // Payment terms — compute before stock so credit-limit checks run before inventory mutations.
        Order.PaymentMode paymentMode = req != null ? req.getPaymentMode() : null;
        if (paymentMode == null) {
            paymentMode = Order.PaymentMode.CASH; // backward compatible default
        }

        BigDecimal orderTotal = order.getTotalAmount() != null ? order.getTotalAmount() : BigDecimal.ZERO;
        BigDecimal paidNow = BigDecimal.ZERO;
        if (paymentMode == Order.PaymentMode.CREDIT) {
            paidNow = BigDecimal.ZERO;
        } else {
            if (req != null && req.getPaidNow() != null) {
                paidNow = req.getPaidNow();
            } else {
                paidNow = orderTotal;
            }
        }
        if (paidNow.compareTo(BigDecimal.ZERO) < 0) {
            paidNow = BigDecimal.ZERO;
        }
        if (paidNow.compareTo(orderTotal) > 0) {
            throw new RuntimeException("paidNow cannot exceed order total");
        }

        BigDecimal remainingCredit = orderTotal.subtract(paidNow).max(BigDecimal.ZERO);

        if (remainingCredit.compareTo(BigDecimal.ZERO) > 0) {
            Integer creditDaysEarly = req != null ? req.getCreditDays() : null;
            if (creditDaysEarly == null || creditDaysEarly <= 0) {
                throw new RuntimeException("creditDays must be > 0 for remaining credit amount");
            }
        }

        if (!forceCredit && remainingCredit.compareTo(BigDecimal.ZERO) > 0) {
            Retailer retailer = order.getRetailer();
            if (retailer != null) {
                BigDecimal limit = retailer.getCreditLimit();
                if (limit != null && limit.compareTo(BigDecimal.ZERO) > 0) {
                    RetailerCreditSummaryDTO summary =
                            khatabookService.getRetailerCreditSummary(wholesaler.getId(), retailer.getId());
                    BigDecimal currentOutstanding = summary.getTotalOutstanding() != null
                            ? summary.getTotalOutstanding()
                            : BigDecimal.ZERO;
                    BigDecimal projected = currentOutstanding.add(remainingCredit);
                    if (projected.compareTo(limit) > 0) {
                        throw new RuntimeException("CREDIT_LIMIT_EXCEEDED");
                    }
                }
            }
        }

        if (order.getOrderItems() != null) {
            for (OrderItem item : order.getOrderItems()) {
                Product p = item.getProduct();
                int orderedQty = item.getQty() == null ? 0 : item.getQty();

                if (p == null) {
                    warnings.add("Product missing for item: " + item.getProductNameSnapshot());
                    continue;
                }

                int unitsPerSelling = (p.getUnitsPerSelling() != null && p.getUnitsPerSelling() > 0)
                        ? p.getUnitsPerSelling()
                        : 1;
                int orderedQtyBase = Math.max(0, orderedQty * unitsPerSelling);

                int stock = p.getStock() == null ? 0 : Math.max(0, p.getStock());
                int reserved = p.getReservedStock() == null ? 0 : Math.max(0, p.getReservedStock());
                int available = Math.max(0, stock - reserved);

                if (!force && orderedQtyBase > available) {
                    throw new RuntimeException("Insufficient stock for: " + p.getName()
                            + " (ordered base units " + orderedQtyBase + ", available " + available + ")");
                }

                int fulfillQtyBase = force ? Math.min(orderedQtyBase, stock) : Math.min(orderedQtyBase, available);

                if (fulfillQtyBase < orderedQtyBase) {
                    warnings.add("Shortage for " + p.getName()
                            + ": ordered base units " + orderedQtyBase + ", fulfilled " + fulfillQtyBase + ", available " + available);
                }

                int newStock = Math.max(0, stock - fulfillQtyBase);
                int reservedDecrease = Math.min(reserved, fulfillQtyBase);
                int newReserved = Math.max(0, reserved - reservedDecrease);

                p.setStock(newStock);
                p.setReservedStock(newReserved);
                productRepository.save(p);
            }
        }

        order.setStatus(Order.Status.ACCEPTED);
        LocalDateTime acceptedAt = LocalDateTime.now();
        order.setAcceptedAt(acceptedAt);

        order.setPaymentMode(paymentMode);

        if (remainingCredit.compareTo(BigDecimal.ZERO) > 0) {
            Integer creditDays = req != null ? req.getCreditDays() : null;
            if (creditDays == null || creditDays <= 0) {
                throw new RuntimeException("creditDays must be > 0 for remaining credit amount");
            }
            order.setApprovedCreditAmount(remainingCredit);
            order.setCreditDays(creditDays);
            java.time.LocalDateTime placed = order.getPlacedAt() != null ? order.getPlacedAt() : acceptedAt;
            order.setDueDate(placed.plusDays(creditDays));
            order.setCreditDueDate(LocalDateTime.now().plusDays(creditDays));
        } else {
            order.setApprovedCreditAmount(BigDecimal.ZERO);
            order.setCreditDays(0);
            order.setDueDate(null);
            order.setCreditDueDate(null);
        }

        Order saved = orderRepository.save(order);

        reconcileReservedStockForWholesaler(wholesaler);

        if (remainingCredit.compareTo(BigDecimal.ZERO) > 0) {
            createDebitLedgerEntryForAcceptedOrder(
                    saved,
                    remainingCredit,
                    paidNow,
                    paymentMode,
                    saved.getCreditDays(),
                    saved.getDueDate()
            );
        }

        if (paidNow.compareTo(BigDecimal.ZERO) > 0) {
            Payment.PaymentMode payMode = paymentMode == Order.PaymentMode.UPI
                    ? Payment.PaymentMode.UPI
                    : Payment.PaymentMode.CASH;
            paymentService.recordImmediateWholesalerPayment(
                    identifier,
                    saved,
                    paidNow,
                    payMode,
                    null,
                    "Paid at acceptance"
            );
        }

        java.util.Map<String, Object> resp = new java.util.HashMap<>();
        resp.put("success", true);
        resp.put("forced", force);
        resp.put("forcedCredit", forceCredit);
        resp.put("warnings", warnings);
        resp.put("order", saved);
        return resp;
    }

    private void createDebitLedgerEntryForAcceptedOrder(
            Order order,
            BigDecimal creditAmount,
            BigDecimal paidNow,
            Order.PaymentMode paymentMode,
            Integer creditDays,
            LocalDateTime dueDate
    ) {
        BigDecimal amount = creditAmount != null ? creditAmount : BigDecimal.ZERO;
        if (amount.compareTo(BigDecimal.ZERO) <= 0) return;

        String orderNumber = order.getOrderNumber() != null ? order.getOrderNumber() : order.getId().toString();

        String dueText = "";
        if (creditDays != null && creditDays > 0) {
            dueText = " | Due in " + creditDays + " days";
        }
        if (dueDate != null) {
            dueText = dueText + " (Due " + dueDate.toLocalDate() + ")";
        }

        String modeLabel = paymentMode != null ? paymentMode.name() : "—";
        String desc;
        if (paymentMode == Order.PaymentMode.CREDIT) {
            desc = "Order #" + orderNumber + ": Credit sale ₹" + amount + dueText;
        } else {
            BigDecimal paid = paidNow != null ? paidNow : BigDecimal.ZERO;
            desc = "Order #" + orderNumber + ": Paid ₹" + paid + " via " + modeLabel + " at acceptance. Balance on credit ₹" + amount + dueText;
        }

        LedgerEntry entry = LedgerEntry.builder()
                .wholesaler(order.getWholesaler())
                .retailer(order.getRetailer())
                .relatedOrder(order)
                .entryType(LedgerEntry.EntryType.DEBIT)
                .amount(amount)
                .description(desc)
                .entryDate(order.getAcceptedAt() != null ? order.getAcceptedAt() : LocalDateTime.now())
                .build();
        ledgerEntryRepository.save(entry);
    }

    // ==========================================================
    // WHOLESALER: Direct edit order (no retailer approval)
    // ==========================================================
    @Transactional
    public java.util.Map<String, Object> wholesalerEditOrder(String identifier, UUID orderId, WholesalerOrderEditRequest req) {
        if (req == null || req.getReason() == null || req.getReason().trim().isEmpty()) {
            throw new RuntimeException("Edit reason is required");
        }
        if (req.getItems() == null || req.getItems().isEmpty()) {
            throw new RuntimeException("At least one item edit is required");
        }

        Wholesaler wholesaler = identifier.contains("@")
                ? wholesalerRepository.findByUserEmail(identifier)
                        .orElseThrow(() -> new RuntimeException("Wholesaler not found"))
                : wholesalerRepository.findByUserPhone(identifier)
                        .orElseThrow(() -> new RuntimeException("Wholesaler not found"));

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        if (!order.getWholesaler().getId().equals(wholesaler.getId())) {
            throw new RuntimeException("Access denied: Order not linked to this wholesaler");
        }

        // Order becomes immutable once it reaches PACKING (Packed) or later.
        // Also block edit for terminal/invalid states.
        Order.Status st = order.getStatus();
        if (st == null) {
            throw new RuntimeException("Order status unavailable");
        }
        if (st == Order.Status.PACKING
                || st == Order.Status.DISPATCHED
                || st == Order.Status.DELIVERED
                || st == Order.Status.INVOICED
                || st == Order.Status.COMPLETED
                || st == Order.Status.CANCELLED
                || st == Order.Status.REJECTED) {
            throw new RuntimeException("Order cannot be edited after it is packed");
        }

        BigDecimal paidOnOrder = sumConfirmedPaymentsForOrder(order);
        if (paidOnOrder.compareTo(BigDecimal.ZERO) > 0) {
            throw new RuntimeException("Order cannot be edited after any payment has been recorded");
        }

        // Index items by ID for quick lookup
        java.util.Map<java.util.UUID, OrderItem> itemById = new java.util.HashMap<>();
        if (order.getOrderItems() != null) {
            for (OrderItem oi : order.getOrderItems()) {
                if (oi.getId() != null) itemById.put(oi.getId(), oi);
            }
        }

        java.util.List<String> changed = new java.util.ArrayList<>();

        for (WholesalerOrderEditRequest.ItemEdit ie : req.getItems()) {
            if (ie == null || ie.getOrderItemId() == null) {
                throw new RuntimeException("orderItemId is required");
            }
            OrderItem oi = itemById.get(ie.getOrderItemId());
            if (oi == null) {
                throw new RuntimeException("Order item not found: " + ie.getOrderItemId());
            }

            Integer newQty = ie.getNewQty();
            Double newUnitPrice = ie.getNewUnitPrice();

            if (newQty != null && newQty <= 0) {
                throw new RuntimeException("Invalid qty for item: " + oi.getProductNameSnapshot());
            }
            if (newUnitPrice != null && newUnitPrice < 0) {
                throw new RuntimeException("Invalid unit price for item: " + oi.getProductNameSnapshot());
            }

            // Capture originals only on first edit
            if (oi.getOriginalQty() == null) oi.setOriginalQty(oi.getQty());
            if (oi.getOriginalUnitPrice() == null) oi.setOriginalUnitPrice(oi.getUnitPriceSnapshot());
            if (oi.getOriginalLineTotal() == null) oi.setOriginalLineTotal(oi.getLineTotal());

            boolean anyFieldChanged = false;

            if (newQty != null && !newQty.equals(oi.getQty())) {
                changed.add(oi.getProductNameSnapshot() + ": qty " + oi.getQty() + " → " + newQty);
                oi.setQty(newQty);
                anyFieldChanged = true;
            }

            BigDecimal newUnitPriceBd = newUnitPrice != null
                    ? BigDecimal.valueOf(newUnitPrice).setScale(SCALE, ROUNDING)
                    : null;
            if (newUnitPriceBd != null && (oi.getUnitPriceSnapshot() == null || newUnitPriceBd.compareTo(oi.getUnitPriceSnapshot()) != 0)) {
                changed.add(oi.getProductNameSnapshot() + ": price " + oi.getUnitPriceSnapshot() + " → " + newUnitPriceBd);
                oi.setUnitPriceSnapshot(newUnitPriceBd);
                anyFieldChanged = true;
            }

            if (anyFieldChanged) {
                int qty = oi.getQty() == null ? 0 : oi.getQty();
                BigDecimal price = oi.getUnitPriceSnapshot() == null ? BigDecimal.ZERO : oi.getUnitPriceSnapshot();
                oi.setLineTotal(price.multiply(BigDecimal.valueOf(qty)).setScale(SCALE, ROUNDING));
                orderItemRepository.save(oi);
            }
        }

        // Recompute totals from current orderItems
        BigDecimal subtotal = BigDecimal.ZERO;
        if (order.getOrderItems() != null) {
            for (OrderItem oi : order.getOrderItems()) {
                BigDecimal lineTotal = oi.getLineTotal() == null ? BigDecimal.ZERO : oi.getLineTotal();
                subtotal = subtotal.add(lineTotal);
            }
        }
        subtotal = subtotal.setScale(SCALE, ROUNDING);
        BigDecimal tax = subtotal.multiply(GST_RATE).setScale(SCALE, ROUNDING);
        BigDecimal total = subtotal.add(tax).add(DELIVERY_CHARGE).setScale(SCALE, ROUNDING);

        order.setSubtotal(subtotal);
        order.setTaxAmount(tax);
        order.setDeliveryCharge(DELIVERY_CHARGE);
        order.setTotalAmount(total);

        order.setEditedAt(java.time.LocalDateTime.now());
        order.setEditedBy(identifier);
        order.setEditReason(req.getReason().trim());

        Order saved = orderRepository.save(order);

        reconcileReservedStockForWholesaler(wholesaler);

        java.util.Map<String, Object> resp = new java.util.HashMap<>();
        resp.put("success", true);
        resp.put("message", "Order updated");
        resp.put("changed", changed);
        resp.put("orderId", saved.getId());
        resp.put("editedAt", saved.getEditedAt());
        return resp;
    }

    private BigDecimal sumConfirmedPaymentsForOrder(Order order) {
        BigDecimal paid = BigDecimal.ZERO;
        if (order == null) {
            return paid;
        }
        List<Payment> payments = paymentRepository.findByOrder(order);
        if (payments == null) {
            return paid;
        }
        for (Payment p : payments) {
            if (p != null && p.getStatus() == Payment.PaymentStatus.CONFIRMED) {
                paid = paid.add(p.getAmount() == null ? BigDecimal.ZERO : p.getAmount());
            }
        }
        return paid;
    }
}
