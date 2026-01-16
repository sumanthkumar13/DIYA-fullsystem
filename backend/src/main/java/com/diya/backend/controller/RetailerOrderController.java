package com.diya.backend.controller;

import com.diya.backend.dto.OrderCheckoutRequest;
import com.diya.backend.dto.OrderCheckoutResponse;
import com.diya.backend.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/retailer/orders")
@RequiredArgsConstructor
public class RetailerOrderController {

    private final OrderService orderService;

    // ✅ Checkout
    @PostMapping("/checkout")
    public ResponseEntity<OrderCheckoutResponse> checkout(@RequestBody OrderCheckoutRequest req) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String identifier = auth.getName();

        OrderCheckoutResponse resp = orderService.checkoutFromCart(identifier, req);
        return ResponseEntity.ok(resp);
    }

    // ✅ Retailer Orders list
    @GetMapping
    public ResponseEntity<?> getRetailerOrders() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String identifier = auth.getName();

        return ResponseEntity.ok(orderService.getOrdersForRetailer(identifier));
    }

    // ✅ Retailer Order details
    @GetMapping("/{orderId}")
    public ResponseEntity<?> getOrderDetails(@PathVariable UUID orderId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String identifier = auth.getName();

        return ResponseEntity.ok(orderService.getRetailerOrderDetails(identifier, orderId));
    }

    // ✅ Retailer Cancel Order (only allowed when status=PLACED)
    @PostMapping("/{orderId}/cancel")
    public ResponseEntity<?> cancelOrder(@PathVariable UUID orderId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String identifier = auth.getName();

        return ResponseEntity.ok(orderService.retailerCancelOrder(identifier, orderId));
    }
}
