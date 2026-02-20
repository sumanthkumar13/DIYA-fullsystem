package com.diya.backend.controller;

import com.diya.backend.dto.order.OrderListItemDTO;
import com.diya.backend.dto.order.WholesalerOrderDetailDTO;
import com.diya.backend.dto.order.WholesalerOrderAcceptRequest;
import com.diya.backend.dto.order.WholesalerOrderEditRequest;
import com.diya.backend.entity.Order;
import com.diya.backend.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/wholesaler/orders")
@RequiredArgsConstructor
public class WholesalerOrderController {

    private final OrderService orderService;

    // ✅ Fetch wholesaler’s orders (incoming + filters)
    @GetMapping
    public ResponseEntity<List<OrderListItemDTO>> getOrdersForWholesaler(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String dateRange,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String identifier = auth.getName();
        String authType = identifier.contains("@") ? "EMAIL" : "PHONE";

        List<OrderListItemDTO> list = orderService.getOrdersForWholesaler(identifier, authType, status, search,
                dateRange, page, size);

        return ResponseEntity.ok(list);
    }

    // ✅ Get order detail for wholesaler
    @GetMapping("/{orderId}")
    public ResponseEntity<WholesalerOrderDetailDTO> getOrderDetail(@PathVariable UUID orderId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String identifier = auth.getName();
        String authType = identifier.contains("@") ? "EMAIL" : "PHONE";

        WholesalerOrderDetailDTO dto = orderService.getWholesalerOrderDetailDto(identifier, authType, orderId);
        return ResponseEntity.ok(dto);
    }

    // ==========================================================
    // ✅ Amazon-style ACTION endpoints
    // ==========================================================

    @PostMapping("/{orderId}/accept")
    public ResponseEntity<?> acceptOrder(
            @PathVariable UUID orderId,
            @RequestParam(required = false, defaultValue = "false") boolean force,
            @RequestBody(required = false) WholesalerOrderAcceptRequest req) {
        try {
            String identifier = SecurityContextHolder.getContext().getAuthentication().getName();
            return ResponseEntity.ok(orderService.wholesalerAcceptOrder(identifier, orderId, force, req));
        } catch (RuntimeException e) {
            java.util.Map<String, Object> errorResponse = new java.util.HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", e.getMessage() != null ? e.getMessage() : "Accept failed");
            return ResponseEntity.badRequest().body(errorResponse);
        } catch (Exception e) {
            java.util.Map<String, Object> errorResponse = new java.util.HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Internal server error: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    @PostMapping("/{orderId}/reject")
    public ResponseEntity<Order> rejectOrder(@PathVariable UUID orderId) {
        String identifier = SecurityContextHolder.getContext().getAuthentication().getName();
        Order updated = orderService.wholesalerUpdateOrderStatus(identifier, orderId, "REJECTED");
        return ResponseEntity.ok(updated);
    }

    @PostMapping("/{orderId}/packing")
    public ResponseEntity<Order> markPacking(@PathVariable UUID orderId) {
        String identifier = SecurityContextHolder.getContext().getAuthentication().getName();
        Order updated = orderService.wholesalerUpdateOrderStatus(identifier, orderId, "PACKING");
        return ResponseEntity.ok(updated);
    }

    @PostMapping("/{orderId}/dispatch")
    public ResponseEntity<Order> dispatchOrder(@PathVariable UUID orderId) {
        String identifier = SecurityContextHolder.getContext().getAuthentication().getName();
        Order updated = orderService.wholesalerUpdateOrderStatus(identifier, orderId, "DISPATCHED");
        return ResponseEntity.ok(updated);
    }

    @PostMapping("/{orderId}/deliver")
    public ResponseEntity<Order> deliverOrder(@PathVariable UUID orderId) {
        String identifier = SecurityContextHolder.getContext().getAuthentication().getName();
        Order updated = orderService.wholesalerUpdateOrderStatus(identifier, orderId, "DELIVERED");
        return ResponseEntity.ok(updated);
    }

    @PostMapping("/{orderId}/complete")
    public ResponseEntity<Order> completeOrder(@PathVariable UUID orderId) {
        String identifier = SecurityContextHolder.getContext().getAuthentication().getName();
        Order updated = orderService.wholesalerUpdateOrderStatus(identifier, orderId, "COMPLETED");
        return ResponseEntity.ok(updated);
    }

    // Optional: wholesaler cancellation policy
    @PostMapping("/{orderId}/cancel")
    public ResponseEntity<Order> cancelOrder(@PathVariable UUID orderId) {
        String identifier = SecurityContextHolder.getContext().getAuthentication().getName();
        Order updated = orderService.wholesalerUpdateOrderStatus(identifier, orderId, "CANCELLED");
        return ResponseEntity.ok(updated);
    }

    // ✅ Direct edit order (no retailer approval)
    @PostMapping("/{orderId}/edit")
    public ResponseEntity<?> editOrder(@PathVariable UUID orderId, @RequestBody WholesalerOrderEditRequest req) {
        try {
            String identifier = SecurityContextHolder.getContext().getAuthentication().getName();
            return ResponseEntity.ok(orderService.wholesalerEditOrder(identifier, orderId, req));
        } catch (RuntimeException e) {
            java.util.Map<String, Object> errorResponse = new java.util.HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", e.getMessage() != null ? e.getMessage() : "Edit failed");
            return ResponseEntity.badRequest().body(errorResponse);
        } catch (Exception e) {
            java.util.Map<String, Object> errorResponse = new java.util.HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Internal server error: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }
}
