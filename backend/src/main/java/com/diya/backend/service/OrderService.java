package com.diya.backend.service;

import com.diya.backend.dto.OrderCheckoutRequest;
import com.diya.backend.dto.OrderCheckoutResponse;
import com.diya.backend.dto.order.OrderListItemDTO;
import com.diya.backend.dto.order.WholesalerOrderDetailDTO;
import com.diya.backend.dto.order.WholesalerOrderItemDetailDTO;
import com.diya.backend.dto.order.WholesalerOrderAcceptRequest;
import com.diya.backend.dto.order.WholesalerOrderEditRequest;
import com.diya.backend.dto.order.WholesalerOrderCreditPatchRequest;
import com.diya.backend.dto.order.WholesalerCreateOrderRequest;
import com.diya.backend.entity.*;
import com.diya.backend.repository.*;
import com.diya.backend.util.OrderPrefixUtil;
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
            BigDecimal lineTotal = BigDecimal.valueOf(p.getPrice()).multiply(BigDecimal.valueOf(qty)).setScale(SCALE, ROUNDING);
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

        // ✅ Debug: Log order creation
        System.out.println("[ORDER SERVICE] Order created - ID: " + order.getId() + 
                ", OrderNumber: " + order.getOrderNumber() + 
                ", WholesalerID: " + order.getWholesaler().getId() + 
                ", Status: " + order.getStatus());

        // 7) Create OrderItems + reserve stock
        for (CartItem ci : itemsToCheckout) {

            Product p = productRepository.findById(ci.getProduct().getId())
                    .orElseThrow(() -> new RuntimeException("Product not found"));

            int qty = ci.getQuantity();

            int stock = p.getStock() == null ? 0 : p.getStock();
            int reserved = p.getReservedStock() == null ? 0 : p.getReservedStock();
            int available = Math.max(0, stock - reserved);

            double unitPrice = p.getPrice();
            double lineTotal = unitPrice * qty;

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

            // reserve stock (partial reservation allowed)
            int reserveQty = Math.min(qty, available);
            p.setReservedStock(reserved + reserveQty);
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

        // ✅ Debug: Log orders found
        System.out.println("[ORDER SERVICE] getOrdersForWholesaler - WholesalerID: " + wholesaler.getId() + 
                ", Total orders found: " + orders.size());
        if (!orders.isEmpty()) {
            System.out.println("[ORDER SERVICE] Sample order - ID: " + orders.get(0).getId() + 
                    ", Status: " + orders.get(0).getStatus() + 
                    ", OrderNumber: " + orders.get(0).getOrderNumber());
        }

        // status filter
        if (status != null && !status.isBlank() && !"all".equalsIgnoreCase(status)) {
            orders = orders.stream()
                    .filter(o -> o.getStatus() != null && o.getStatus().name().equalsIgnoreCase(status))
                    .toList();
        }

        // search filter
        if (search != null && !search.isBlank()) {
            String q = search.toLowerCase();
            orders = orders.stream()
                    .filter(o -> {
                        String rn = o.getRetailer() != null && o.getRetailer().getUser() != null
                                ? o.getRetailer().getUser().getName().toLowerCase()
                                : "";
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
            if (o.getRetailer() != null) {
                Retailer r = o.getRetailer();
                String city = r.getCity() != null ? r.getCity() : "";
                String state = r.getState() != null ? r.getState() : "";
                loc = (city + (city.isEmpty() || state.isEmpty() ? "" : ", ") + state).trim();
            }

            return OrderListItemDTO.builder()
                    .id(o.getId().toString())
                    .orderNumber(o.getOrderNumber())
                    .retailer(o.getRetailer() != null && o.getRetailer().getUser() != null
                            ? o.getRetailer().getUser().getName()
                            : "Unknown")
                    .location(loc)
                    .amount(o.getTotalAmount() == null ? BigDecimal.ZERO : o.getTotalAmount())
                    .date(o.getPlacedAt() == null ? "" : o.getPlacedAt().toString())
                    .status(o.getStatus() == null ? Order.Status.PLACED.name() : o.getStatus().name())
                    .items(itemCount)
                    .exposure("NORMAL")
                    .build();
        }).toList();
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
        for (WholesalerCreateOrderRequest.Item item : items) {
            if (item == null || item.getProductId() == null) {
                throw new RuntimeException("productId is required for each item");
            }
            if (item.getQuantity() == null || item.getQuantity() <= 0) {
                throw new RuntimeException("Quantity must be > 0 for each item");
            }

            Product p = productRepository.findById(item.getProductId())
                    .orElseThrow(() -> new RuntimeException("Product not found: " + item.getProductId()));

            int qty = item.getQuantity();
            BigDecimal lineTotal = BigDecimal.valueOf(p.getPrice())
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

            int qty = item.getQuantity();

            int stock = p.getStock() == null ? 0 : p.getStock();
            int reserved = p.getReservedStock() == null ? 0 : p.getReservedStock();
            int available = Math.max(0, stock - reserved);

            double unitPrice = p.getPrice();
            double lineTotal = unitPrice * qty;

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

            int reserveQty = Math.min(qty, available);
            p.setReservedStock(reserved + reserveQty);
            productRepository.save(p);
        }

        int nextSeq = Optional.ofNullable(wholesaler.getOrderSequence()).orElse(0) + 1;
        String prefix = OrderPrefixUtil.buildPrefix(wholesaler);
        String orderNum = OrderPrefixUtil.formatOrderNumber(prefix, nextSeq);

        order.setOrderNumber(orderNum);
        orderRepository.save(order);

        wholesaler.setOrderSequence(nextSeq);
        wholesalerRepository.save(wholesaler);

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

        return orders.stream().map(o -> {
            int itemCount = o.getOrderItems() == null ? 0 : o.getOrderItems().size();

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
                    .build();
        }).toList();
    }

    // ==========================================================
    // RETAILER: Order detail
    // ==========================================================
    public Order getRetailerOrderDetails(String identifier, UUID orderId) {

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

        // release reserved stock
        if (order.getOrderItems() != null) {
            for (OrderItem item : order.getOrderItems()) {
                Product p = item.getProduct();
                int qty = item.getQty();

                if (p != null) {
                    int reserved = p.getReservedStock() == null ? 0 : p.getReservedStock();
                    p.setReservedStock(Math.max(0, reserved - qty));
                    productRepository.save(p);
                }
            }
        }

        order.setStatus(Order.Status.CANCELLED);
        order.setCancelledAt(LocalDateTime.now());

        return orderRepository.save(order);
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
                Product p = oi.getProduct(); // may be null if deleted
                int stock = p != null && p.getStock() != null ? Math.max(0, p.getStock()) : 0;
                int reserved = p != null && p.getReservedStock() != null ? Math.max(0, p.getReservedStock()) : 0;
                int available = Math.max(0, stock - reserved);

                items.add(WholesalerOrderItemDetailDTO.builder()
                        .orderItemId(oi.getId() != null ? oi.getId().toString() : null)
                        .productNameSnapshot(oi.getProductNameSnapshot())
                        .orderedQty(oi.getQty())
                        .unitSnapshot(oi.getUnitSnapshot())
                        .unitPriceSnapshot(oi.getUnitPriceSnapshot())
                        .lineTotal(oi.getLineTotal())
                        .currentStock(stock)
                        .currentReservedStock(reserved)
                        .availableStock(available)
                        .build());
            }
        }

        BigDecimal paidAmount = BigDecimal.ZERO;
        try {
            java.util.List<Payment> payments = paymentRepository.findByOrder(order);
            if (payments != null) {
                for (Payment pay : payments) {
                    if (pay != null && pay.getStatus() == Payment.PaymentStatus.CONFIRMED) {
                        paidAmount = paidAmount.add(pay.getAmount() == null ? BigDecimal.ZERO : pay.getAmount());
                    }
                }
            }
        } catch (Exception ignored) {
        }

        BigDecimal total = order.getTotalAmount() == null ? BigDecimal.ZERO : order.getTotalAmount();
        BigDecimal outstanding = total.subtract(paidAmount).max(BigDecimal.ZERO);

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
                .build();
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
            if (order.getPlacedAt() != null && d > 0) {
                order.setDueDate(order.getPlacedAt().plusDays(d));
            } else {
                order.setDueDate(null);
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

                int reserved = p.getReservedStock() == null ? 0 : p.getReservedStock();
                int stock = p.getStock() == null ? 0 : p.getStock();

                if (reserved < qty) {
                    throw new RuntimeException("Reserved stock mismatch for: " + p.getName());
                }
                if (stock < qty) {
                    throw new RuntimeException("Stock insufficient at acceptance for: " + p.getName());
                }

                p.setReservedStock(reserved - qty);
                p.setStock(stock - qty);
                productRepository.save(p);
            }

            order.setAcceptedAt(LocalDateTime.now());
        }

        if (target == Order.Status.REJECTED || target == Order.Status.CANCELLED) {
            // release reserved stock
            for (OrderItem item : order.getOrderItems()) {
                Product p = item.getProduct();
                int qty = item.getQty();

                int reserved = p.getReservedStock() == null ? 0 : p.getReservedStock();
                p.setReservedStock(Math.max(0, reserved - qty));

                productRepository.save(p);
            }

            order.setCancelledAt(LocalDateTime.now());
        }

        if (target == Order.Status.DISPATCHED) {
            order.setDispatchedAt(LocalDateTime.now());
        }

        if (target == Order.Status.DELIVERED) {
            order.setDeliveredAt(LocalDateTime.now());
        }

        order.setStatus(target);
        Order savedOrder = orderRepository.save(order);
        if (target == Order.Status.ACCEPTED) {
            createDebitLedgerEntryForAcceptedOrder(savedOrder);
        }
        return savedOrder;
    }

    // ==========================================================
    // WHOLESALER: Accept order with optional force
    // ==========================================================
    @Transactional
    public java.util.Map<String, Object> wholesalerAcceptOrder(
            String identifier,
            UUID orderId,
            boolean force,
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

        // Payment terms
        Order.PaymentMode paymentMode = req != null ? req.getPaymentMode() : null;
        if (paymentMode == null) {
            paymentMode = Order.PaymentMode.CASH; // backward compatible default
        }

        if (order.getOrderItems() != null) {
            for (OrderItem item : order.getOrderItems()) {
                Product p = item.getProduct();
                int orderedQty = item.getQty() == null ? 0 : item.getQty();

                if (p == null) {
                    warnings.add("Product missing for item: " + item.getProductNameSnapshot());
                    continue;
                }

                int stock = p.getStock() == null ? 0 : Math.max(0, p.getStock());
                int reserved = p.getReservedStock() == null ? 0 : Math.max(0, p.getReservedStock());
                int available = Math.max(0, stock - reserved);

                if (!force && orderedQty > available) {
                    throw new RuntimeException("Insufficient stock for: " + p.getName()
                            + " (ordered " + orderedQty + ", available " + available + ")");
                }

                // Deduct what we can fulfill now
                int fulfillQty = force ? Math.min(orderedQty, stock) : Math.min(orderedQty, available);

                if (fulfillQty < orderedQty) {
                    warnings.add("Shortage for " + p.getName()
                            + ": ordered " + orderedQty + ", fulfilled " + fulfillQty + ", available " + available);
                }

                // Apply stock changes (never go negative)
                int newStock = Math.max(0, stock - fulfillQty);
                int reservedDecrease = Math.min(reserved, fulfillQty);
                int newReserved = Math.max(0, reserved - reservedDecrease);

                p.setStock(newStock);
                p.setReservedStock(newReserved);
                productRepository.save(p);
            }
        }

        // Accept timestamps
        order.setStatus(Order.Status.ACCEPTED);
        LocalDateTime acceptedAt = LocalDateTime.now();
        order.setAcceptedAt(acceptedAt);

        // Approved credit amount: default to order total, cap to order total
        BigDecimal orderTotal = order.getTotalAmount() != null ? order.getTotalAmount() : BigDecimal.ZERO;
        BigDecimal approvedCreditAmount = req != null ? req.getApprovedCreditAmount() : null;
        if (approvedCreditAmount == null) {
            approvedCreditAmount = orderTotal;
        } else if (approvedCreditAmount.compareTo(orderTotal) > 0) {
            approvedCreditAmount = orderTotal;
        }
        order.setApprovedCreditAmount(approvedCreditAmount);

        // Apply payment mode rules
        order.setPaymentMode(paymentMode);
        if (paymentMode != Order.PaymentMode.CREDIT) {
            order.setCreditDays(0);
            order.setDueDate(null);
            order.setCreditDueDate(null);
        } else {
            Integer creditDays = req != null ? req.getCreditDays() : null;
            if (creditDays == null || creditDays <= 0) {
                throw new RuntimeException("creditDays must be > 0 for CREDIT orders");
            }
            order.setCreditDays(creditDays);
            java.time.LocalDateTime placed = order.getPlacedAt() != null ? order.getPlacedAt() : acceptedAt;
            order.setDueDate(placed.plusDays(creditDays));
            order.setCreditDueDate(LocalDateTime.now().plusDays(creditDays));
        }

        Order saved = orderRepository.save(order);
        createDebitLedgerEntryForAcceptedOrder(saved);

        java.util.Map<String, Object> resp = new java.util.HashMap<>();
        resp.put("success", true);
        resp.put("forced", force);
        resp.put("warnings", warnings);
        resp.put("order", saved);
        return resp;
    }

    private void createDebitLedgerEntryForAcceptedOrder(Order order) {
        BigDecimal amount = order.getApprovedCreditAmount() != null
                ? order.getApprovedCreditAmount()
                : order.getTotalAmount();
        if (amount == null) amount = BigDecimal.ZERO;
        String orderNumber = order.getOrderNumber() != null ? order.getOrderNumber() : order.getId().toString();
        LedgerEntry entry = LedgerEntry.builder()
                .wholesaler(order.getWholesaler())
                .retailer(order.getRetailer())
                .relatedOrder(order)
                .entryType(LedgerEntry.EntryType.DEBIT)
                .amount(amount)
                .description("Goods supplied on credit (Order #" + orderNumber + ")")
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

        if (order.getStatus() == Order.Status.COMPLETED || order.getStatus() == Order.Status.CANCELLED) {
            throw new RuntimeException("Cannot edit order after COMPLETED/CANCELLED");
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

            if (newUnitPrice != null && !newUnitPrice.equals(oi.getUnitPriceSnapshot())) {
                changed.add(oi.getProductNameSnapshot() + ": price " + oi.getUnitPriceSnapshot() + " → " + newUnitPrice);
                oi.setUnitPriceSnapshot(newUnitPrice);
                anyFieldChanged = true;
            }

            if (anyFieldChanged) {
                int qty = oi.getQty() == null ? 0 : oi.getQty();
                double price = oi.getUnitPriceSnapshot() == null ? 0.0 : oi.getUnitPriceSnapshot();
                oi.setLineTotal(price * qty);
                orderItemRepository.save(oi);
            }
        }

        // Recompute totals from current orderItems
        BigDecimal subtotal = BigDecimal.ZERO;
        if (order.getOrderItems() != null) {
            for (OrderItem oi : order.getOrderItems()) {
                BigDecimal lineTotal = oi.getLineTotal() == null ? BigDecimal.ZERO : BigDecimal.valueOf(oi.getLineTotal());
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

        java.util.Map<String, Object> resp = new java.util.HashMap<>();
        resp.put("success", true);
        resp.put("message", "Order updated");
        resp.put("changed", changed);
        resp.put("orderId", saved.getId());
        resp.put("editedAt", saved.getEditedAt());
        return resp;
    }
}
