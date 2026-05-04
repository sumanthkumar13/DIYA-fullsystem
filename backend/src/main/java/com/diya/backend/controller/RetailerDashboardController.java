package com.diya.backend.controller;

import com.diya.backend.config.JwtUtil;
import com.diya.backend.entity.LedgerEntry;
import com.diya.backend.entity.Order;
import com.diya.backend.entity.Payment;
import com.diya.backend.entity.Product;
import com.diya.backend.entity.Retailer;
import com.diya.backend.entity.Wholesaler;
import com.diya.backend.repository.LedgerEntryRepository;
import com.diya.backend.repository.OrderRepository;
import com.diya.backend.repository.PaymentRepository;
import com.diya.backend.repository.ProductRepository;
import com.diya.backend.repository.RetailerRepository;
import com.diya.backend.util.LedgerAccounting;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/retailer/dashboard")
@RequiredArgsConstructor
public class RetailerDashboardController {

    private final JwtUtil jwtUtil;
    private final RetailerRepository retailerRepository;
    private final OrderRepository orderRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final PaymentRepository paymentRepository;
    private final ProductRepository productRepository;

    @GetMapping
    public ResponseEntity<?> getDashboard(@RequestHeader(HttpHeaders.AUTHORIZATION) String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body(Map.of("message", "Missing token"));
        }
        String token = authHeader.substring(7);
        if (!jwtUtil.validateToken(token)) {
            return ResponseEntity.status(401).body(Map.of("message", "Invalid token"));
        }

        String identifier = jwtUtil.extractIdentifier(token);
        String authType = jwtUtil.extractAuthType(token);
        String role = jwtUtil.extractRole(token);

        if (!"RETAILER".equalsIgnoreCase(role)) {
            return ResponseEntity.status(403).body(Map.of("message", "Only retailers can access this endpoint"));
        }

        // Resolve retailer by identifier (phone or email)
        Retailer retailer;
        if ("PHONE".equalsIgnoreCase(authType)) {
            retailer = retailerRepository.findByPhoneContact(identifier)
                    .orElseGet(() -> retailerRepository.findByUserPhone(identifier).orElse(null));
        } else {
            retailer = retailerRepository.findByUserEmail(identifier).orElse(null);
        }
        if (retailer == null) {
            return ResponseEntity.status(404).body(Map.of("message", "Retailer not found"));
        }

        Map<String, Object> resp = new HashMap<>();

        // Profile
        Map<String, Object> profile = new HashMap<>();
        profile.put("id", retailer.getId());
        profile.put("shopName", retailer.getShopName());
        profile.put("city", retailer.getCity());
        profile.put("state", retailer.getState());
        profile.put("phone", retailer.getPhoneContact());
        profile.put("gstNumber", retailer.getGstNumber());
        profile.put("avatarUrl", retailer.getUser() != null ? retailer.getUser().getAvatarUrl() : null);
        resp.put("retailerProfile", profile);

        // Orders for this retailer
        List<Order> allOrders = orderRepository.findByRetailer(retailer);
        List<Map<String, Object>> orders = allOrders.stream().map(o -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", o.getId());
            m.put("orderNumber", o.getOrderNumber());
            m.put("status", o.getStatus());
            m.put("paymentStatus", o.getPaymentStatus());
            m.put("placedAt", o.getPlacedAt());
            m.put("totalAmount", o.getTotalAmount());
            return m;
        }).collect(Collectors.toList());
        resp.put("orders", orders);

        // Pending vs completed
        resp.put("pendingOrders", orders.stream()
                .filter(o -> {
                    String s = String.valueOf(o.get("status"));
                    return !"DELIVERED".equals(s) && !"COMPLETED".equals(s) && !"CANCELLED".equals(s) && !"REJECTED".equals(s);
                })
                .collect(Collectors.toList()));

        resp.put("completedOrders", orders.stream()
                .filter(o -> {
                    String s = String.valueOf(o.get("status"));
                    return "DELIVERED".equals(s) || "COMPLETED".equals(s);
                })
                .collect(Collectors.toList()));

        // Outstanding from ledger: DEBIT − CREDIT only (immediate cash at acceptance is ORDER_PAYMENT_INFO).
        List<LedgerEntry> ledgerEntries = ledgerEntryRepository.findByRetailer(retailer);
        BigDecimal outstanding = ledgerEntries.stream()
                .map(LedgerAccounting::signedEffect)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (outstanding == null) outstanding = BigDecimal.ZERO;
        resp.put("outstandingBalance", outstanding.max(BigDecimal.ZERO));

        LocalDateTime now = LocalDateTime.now();
        BigDecimal overdue = ledgerEntries.stream()
                .filter(e -> e.getEntryType() == LedgerEntry.EntryType.DEBIT
                        && e.getEntryDate() != null
                        && e.getEntryDate().isBefore(now.minusDays(7)))
                .map(LedgerEntry::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (overdue == null) overdue = BigDecimal.ZERO;
        resp.put("overdueAmount", overdue);

        // Recent transactions: payments for this retailer
        List<Payment> recentPayments = paymentRepository.findByRetailerOrderByCreatedAtDesc(retailer)
                .stream()
                .limit(10)
                .collect(Collectors.toList());
        List<Map<String, Object>> tx = recentPayments.stream().map(p -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", p.getId());
            m.put("amount", p.getAmount());
            m.put("status", p.getStatus());
            m.put("mode", p.getMode());
            m.put("createdAt", p.getCreatedAt());
            return m;
        }).collect(Collectors.toList());
        resp.put("recentTransactions", tx);

        // Product catalog: products shared by wholesaler (active + visible)
        // Assume retailer is connected to exactly one wholesaler for now.
        Wholesaler wholesaler = retailer.getWholesaler();
        if (wholesaler != null && wholesaler.getId() != null) {
            List<Product> products = productRepository
                    .findByWholesalerIdAndVisibleToRetailerTrueAndActiveTrue(wholesaler.getId(),
                            org.springframework.data.domain.PageRequest.of(0, 100))
                    .getContent();
            List<Map<String, Object>> catalog = products.stream().map(p -> {
                Map<String, Object> m = new HashMap<>();
                m.put("id", p.getId());
                m.put("name", p.getName());
                m.put("price", p.getPrice() != null ? p.getPrice().doubleValue() : null);
                m.put("sku", p.getSku());
                m.put("stock", p.getStock());
                m.put("imageUrl", p.getImageUrl());
                return m;
            }).collect(Collectors.toList());
            resp.put("productCatalog", catalog);
        } else {
            resp.put("productCatalog", List.of());
        }

        return ResponseEntity.ok(resp);
    }
}

