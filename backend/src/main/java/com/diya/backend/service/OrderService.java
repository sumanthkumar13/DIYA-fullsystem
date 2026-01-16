package com.diya.backend.service;

import com.diya.backend.dto.OrderCheckoutRequest;
import com.diya.backend.dto.OrderCheckoutResponse;
import com.diya.backend.dto.order.OrderListItemDTO;
import com.diya.backend.entity.*;
import com.diya.backend.repository.*;
import com.diya.backend.util.OrderPrefixUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class OrderService {

    private static final double GST_RATE = 0.05;
    private static final double DELIVERY_CHARGE = 50.0;

    private final OrderRepository orderRepository;
    private final WholesalerRepository wholesalerRepository;
    private final RetailerRepository retailerRepository;
    private final ProductRepository productRepository;
    private final OrderItemRepository orderItemRepository;
    private final CartItemRepository cartItemRepository;
    private final CartRepository cartRepository;
    private final UserRepository userRepository;
    private final ConnectionService connectionService;

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

        // 5) Validate items + totals (use product DB values for snapshot)
        double subtotal = 0.0;

        for (CartItem ci : cart.getItems()) {
            Product p = productRepository.findById(ci.getProduct().getId())
                    .orElseThrow(() -> new RuntimeException("Product not found"));

            int qty = ci.getQuantity();
            if (qty <= 0) {
                throw new RuntimeException("Invalid qty for product: " + p.getName());
            }

            int stock = p.getStock() == null ? 0 : p.getStock();
            int reserved = p.getReservedStock() == null ? 0 : p.getReservedStock();
            int available = stock - reserved;

            if (available < qty) {
                throw new RuntimeException("Insufficient stock for: " + p.getName());
            }

            subtotal += p.getPrice() * qty;
        }

        double tax = subtotal * GST_RATE;
        double delivery = DELIVERY_CHARGE;
        double total = subtotal + tax + delivery;

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
                .deliveryCharge(delivery)
                .totalAmount(total)
                .build();

        order = orderRepository.save(order);

        // 7) Create OrderItems + reserve stock
        for (CartItem ci : cart.getItems()) {

            Product p = productRepository.findById(ci.getProduct().getId())
                    .orElseThrow(() -> new RuntimeException("Product not found"));

            int qty = ci.getQuantity();

            int stock = p.getStock() == null ? 0 : p.getStock();
            int reserved = p.getReservedStock() == null ? 0 : p.getReservedStock();
            int available = stock - reserved;

            if (available < qty) {
                throw new RuntimeException("Insufficient stock for: " + p.getName());
            }

            double unitPrice = p.getPrice();
            double lineTotal = unitPrice * qty;

            // ✅ Snapshot fields
            OrderItem oi = OrderItem.builder()
                    .order(order)
                    .product(p)
                    .productIdSnapshot(p.getId())
                    .productNameSnapshot(p.getName())
                    .unitSnapshot(p.getUnit())
                    .qty(qty)
                    .unitPriceSnapshot(unitPrice)
                    .lineTotal(lineTotal)
                    .build();

            orderItemRepository.save(oi);

            // reserve stock
            p.setReservedStock(reserved + qty);
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
        for (CartItem ci : new ArrayList<>(cart.getItems())) {
            cartItemRepository.delete(ci);
        }
        cart.getItems().clear();
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
                    .retailer(o.getRetailer() != null && o.getRetailer().getUser() != null
                            ? o.getRetailer().getUser().getName()
                            : "Unknown")
                    .location(loc)
                    .amount(o.getTotalAmount() == null ? 0.0 : o.getTotalAmount())
                    .date(o.getPlacedAt() == null ? "" : o.getPlacedAt().toString())
                    .status(o.getStatus() == null ? Order.Status.PLACED.name() : o.getStatus().name())
                    .items(itemCount)
                    .exposure("NORMAL")
                    .build();
        }).toList();
    }

    // ==========================================================
    // RETAILER: Orders list
    // ==========================================================
    public List<OrderListItemDTO> getOrdersForRetailer(String identifier) {

        Retailer retailer = identifier.contains("@")
                ? retailerRepository.findByUserEmail(identifier)
                        .orElseThrow(() -> new RuntimeException("Retailer not found"))
                : retailerRepository.findByUserPhone(identifier)
                        .orElseThrow(() -> new RuntimeException("Retailer not found"));

        List<Order> orders = orderRepository.findByRetailer(retailer);

        return orders.stream().map(o -> {
            int itemCount = o.getOrderItems() == null ? 0 : o.getOrderItems().size();

            return OrderListItemDTO.builder()
                    .id(o.getId().toString())
                    .retailer(retailer.getUser().getName())
                    .location(retailer.getCity() + ", " + retailer.getState())
                    .amount(o.getTotalAmount() == null ? 0.0 : o.getTotalAmount())
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

        Retailer retailer = identifier.contains("@")
                ? retailerRepository.findByUserEmail(identifier)
                        .orElseThrow(() -> new RuntimeException("Retailer not found"))
                : retailerRepository.findByUserPhone(identifier)
                        .orElseThrow(() -> new RuntimeException("Retailer not found"));

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        if (!order.getRetailer().getId().equals(retailer.getId())) {
            throw new RuntimeException("Access denied: Order not linked to this retailer");
        }

        return order;
    }

    @Transactional
    public Order retailerCancelOrder(String identifier, UUID orderId) {

        Retailer retailer = identifier.contains("@")
                ? retailerRepository.findByUserEmail(identifier)
                        .orElseThrow(() -> new RuntimeException("Retailer not found"))
                : retailerRepository.findByUserPhone(identifier)
                        .orElseThrow(() -> new RuntimeException("Retailer not found"));

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
        return orderRepository.save(order);
    }
}
