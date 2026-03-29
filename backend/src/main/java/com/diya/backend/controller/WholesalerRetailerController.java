package com.diya.backend.controller;

import com.diya.backend.entity.Connection;
import com.diya.backend.entity.Retailer;
import com.diya.backend.entity.User;
import com.diya.backend.entity.Wholesaler;
import com.diya.backend.dto.retailer.RetailerCreditSummaryDTO;
import com.diya.backend.repository.ConnectionRepository;
import com.diya.backend.repository.RetailerRepository;
import com.diya.backend.repository.UserRepository;
import com.diya.backend.repository.WholesalerRepository;
import com.diya.backend.service.KhatabookService;
import com.diya.backend.util.RegionCatalog;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/wholesaler/retailers")
@RequiredArgsConstructor
public class WholesalerRetailerController {

    private final UserRepository userRepository;
    private final WholesalerRepository wholesalerRepository;
    private final RetailerRepository retailerRepository;
    private final ConnectionRepository connectionRepository;
    private final KhatabookService khatabookService;

    /**
     * GET /api/wholesaler/retailers — list all retailers for the logged-in wholesaler.
     * Returns retailers linked via APPROVED connections (created by wholesaler or approved connection requests).
     */
    @GetMapping
    public ResponseEntity<?> getRetailers() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String identifier = auth.getName();

        User user = identifier.contains("@")
                ? userRepository.findByEmail(identifier).orElse(null)
                : userRepository.findByPhone(identifier).orElse(null);
        if (user == null || user.getRole() != User.Role.WHOLESALER) {
            return ResponseEntity.status(403).body(Map.of("message", "Only wholesalers can list retailers"));
        }

        Wholesaler wholesaler = wholesalerRepository.findByUserId(user.getId()).orElse(null);
        if (wholesaler == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Wholesaler profile not found"));
        }

        List<Connection> approved = connectionRepository.findByWholesalerAndStatusOrderByRequestedAtDesc(
                wholesaler, Connection.Status.APPROVED);
        List<Map<String, Object>> result = approved.stream()
                .map(conn -> {
                    Retailer r = conn.getRetailer();
                    String name = r.getUser() != null && r.getUser().getName() != null
                            ? r.getUser().getName()
                            : (r.getShopName() != null ? r.getShopName() : "Retailer");
                    Map<String, Object> m = new HashMap<>();
                    m.put("id", r.getId());
                    m.put("retailerId", r.getId());
                    m.put("name", name);
                    m.put("retailerBusinessName", name);
                    m.put("phone", r.getPhoneContact());
                    m.put("retailerPhone", r.getPhoneContact());
                    m.put("location", r.getRegion() != null && !r.getRegion().isBlank()
                            ? r.getRegion()
                            : (r.getCity() != null ? r.getCity() : ""));
                    m.put("retailerCity", r.getCity());
                    m.put("region", r.getRegion());
                    return m;
                })
                .toList();

        return ResponseEntity.ok(result);
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createRetailer(@RequestBody Map<String, Object> body) {
        Map<String, Object> resp = new HashMap<>();

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String identifier = auth.getName();

        User user = identifier.contains("@")
                ? userRepository.findByEmail(identifier).orElse(null)
                : userRepository.findByPhone(identifier).orElse(null);
        if (user == null || user.getRole() != User.Role.WHOLESALER) {
            resp.put("success", false);
            resp.put("message", "Only wholesalers can create retailers");
            return ResponseEntity.status(403).body(resp);
        }

        Wholesaler wholesaler = wholesalerRepository.findByUserId(user.getId()).orElse(null);
        if (wholesaler == null) {
            resp.put("success", false);
            resp.put("message", "Wholesaler profile not found");
            return ResponseEntity.badRequest().body(resp);
        }

        String retailerName = (String) body.getOrDefault("retailerName", "");
        String phone = (String) body.getOrDefault("phone", "");
        String shopName = (String) body.getOrDefault("shopName", "");
        String address = (String) body.getOrDefault("address", "");
        String gstNumber = (String) body.getOrDefault("gstNumber", "");
        Object creditLimitRaw = body.get("creditLimit");
        String notes = (String) body.getOrDefault("notes", "");
        String region = (String) body.getOrDefault("region", "");
        try {
            RegionCatalog.requireValidRegion(region);
        } catch (RuntimeException ex) {
            resp.put("success", false);
            resp.put("message", ex.getMessage());
            return ResponseEntity.badRequest().body(resp);
        }
        region = region.trim();

        if (retailerName == null || retailerName.isBlank()
                || phone == null || phone.isBlank()
                || shopName == null || shopName.isBlank()) {
            resp.put("success", false);
            resp.put("message", "Retailer name, phone and shop name are required");
            return ResponseEntity.badRequest().body(resp);
        }

        // Enforce global phone uniqueness across User and Retailer
        userRepository.findByPhone(phone).ifPresent(u -> {
            throw new RuntimeException("Phone already registered");
        });
        retailerRepository.findByPhoneContact(phone).ifPresent(r -> {
            throw new RuntimeException("Phone already registered");
        });

        BigDecimal creditLimit = null;
        if (creditLimitRaw instanceof Number) {
            creditLimit = BigDecimal.valueOf(((Number) creditLimitRaw).doubleValue());
        }

        final Retailer retailerToSave = Retailer.builder()
                .user(null)
                .shopName(shopName)
                .address(address)
                .city(null)
                .region(region)
                .state("Not Provided")
                .phoneContact(phone)
                .isActive(true)
                .accountStatus(Retailer.AccountStatus.CREATED_BY_WHOLESALER)
                .gstNumber(gstNumber)
                .creditLimit(creditLimit)
                .notes(notes)
                .build();

        Retailer retailer = retailerRepository.save(retailerToSave);

        // Create or update connection between this wholesaler and retailer, mark as
        // APPROVED
        Connection connection = connectionRepository.findByWholesalerAndRetailer(wholesaler, retailer)
                .orElseGet(() -> Connection.builder()
                        .wholesaler(wholesaler)
                        .retailer(retailer)
                        .build());
        connection.setStatus(Connection.Status.APPROVED);
        connectionRepository.save(connection);

        resp.put("success", true);
        resp.put("message", "Retailer invited successfully");
        resp.put("retailerId", retailer.getId());
        return ResponseEntity.ok(resp);
    }

    // ==========================================================
    // Search connected retailers for this wholesaler (autocomplete)
    // - If query is empty or missing -> return ALL connected retailers
    // - If query is present         -> filter by name / shop / phone (case-insensitive)
    // ==========================================================
    @GetMapping("/search")
    public ResponseEntity<?> searchRetailers(@RequestParam(value = "query", required = false) String query) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String identifier = auth.getName();

        User user = identifier.contains("@")
                ? userRepository.findByEmail(identifier).orElse(null)
                : userRepository.findByPhone(identifier).orElse(null);
        if (user == null || user.getRole() != User.Role.WHOLESALER) {
            return ResponseEntity.status(403).body(Map.of("message", "Only wholesalers can search retailers"));
        }

        Wholesaler wholesaler = wholesalerRepository.findByUserId(user.getId()).orElse(null);
        if (wholesaler == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Wholesaler profile not found"));
        }

        String q = query == null ? "" : query.trim().toLowerCase();

        // Start from all APPROVED connections so we include:
        // 1) Retailers created by wholesaler
        // 2) Self-signup retailers connected to this wholesaler
        List<Connection> approved = connectionRepository.findByWholesalerAndStatusOrderByRequestedAtDesc(
                wholesaler, Connection.Status.APPROVED);

        List<Map<String, Object>> all = approved.stream()
                .map(conn -> {
                    Retailer r = conn.getRetailer();
                    String retailerName = r.getUser() != null && r.getUser().getName() != null
                            ? r.getUser().getName()
                            : (r.getShopName() != null ? r.getShopName() : "Retailer");
                    String shopName = r.getShopName() != null ? r.getShopName() : retailerName;
                    String city = r.getCity() != null ? r.getCity() : "";
                    String state = r.getState() != null ? r.getState() : "";
                    String reg = r.getRegion() != null ? r.getRegion().trim() : "";
                    String location = !reg.isEmpty()
                            ? reg
                            : (city + (city.isEmpty() || state.isEmpty() ? "" : " – ") + state).trim();
                    String phone = r.getPhoneContact() != null ? r.getPhoneContact() : "";

                    Map<String, Object> m = new HashMap<>();
                    m.put("id", r.getId());
                    m.put("name", retailerName);
                    m.put("shopName", shopName);
                    m.put("location", location);
                    m.put("phone", phone);
                    return m;
                })
                .toList();

        // If no query -> return all connected retailers (up to 50 for safety)
        if (q.isEmpty()) {
            return ResponseEntity.ok(all.stream().limit(50).toList());
        }

        // Filter by name / shopName / phone (case-insensitive)
        List<Map<String, Object>> filtered = all.stream()
                .filter(m -> {
                    String name = String.valueOf(m.getOrDefault("name", "")).toLowerCase();
                    String shop = String.valueOf(m.getOrDefault("shopName", "")).toLowerCase();
                    String phone = String.valueOf(m.getOrDefault("phone", "")).toLowerCase();
                    return name.contains(q) || shop.contains(q) || phone.contains(q);
                })
                .limit(20)
                .toList();

        return ResponseEntity.ok(filtered);
    }

    /**
     * GET /api/wholesaler/retailers/{retailerId}/credit-summary
     */
    @GetMapping("/{retailerId}/credit-summary")
    public ResponseEntity<?> getCreditSummary(@PathVariable UUID retailerId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String identifier = auth.getName();
        User user = identifier.contains("@")
                ? userRepository.findByEmail(identifier).orElse(null)
                : userRepository.findByPhone(identifier).orElse(null);
        if (user == null || user.getRole() != User.Role.WHOLESALER) {
            return ResponseEntity.status(403).body(Map.of("message", "Only wholesalers can view credit summary"));
        }
        Wholesaler wholesaler = wholesalerRepository.findByUserId(user.getId()).orElse(null);
        if (wholesaler == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Wholesaler profile not found"));
        }
        try {
            RetailerCreditSummaryDTO dto = khatabookService.getRetailerCreditSummary(wholesaler.getId(), retailerId);
            return ResponseEntity.ok(dto);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage() != null ? e.getMessage() : "Failed"));
        }
    }

    /**
     * PATCH /api/wholesaler/retailers/{retailerId}/credit-limit
     * Body: { "creditLimit": 150000 } or { "creditLimit": null } to clear.
     */
    @PatchMapping("/{retailerId}/credit-limit")
    public ResponseEntity<Map<String, Object>> patchCreditLimit(
            @PathVariable UUID retailerId,
            @RequestBody Map<String, Object> body) {
        Map<String, Object> resp = new HashMap<>();
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String identifier = auth.getName();
        User user = identifier.contains("@")
                ? userRepository.findByEmail(identifier).orElse(null)
                : userRepository.findByPhone(identifier).orElse(null);
        if (user == null || user.getRole() != User.Role.WHOLESALER) {
            resp.put("success", false);
            resp.put("message", "Only wholesalers can update credit limit");
            return ResponseEntity.status(403).body(resp);
        }
        Wholesaler wholesaler = wholesalerRepository.findByUserId(user.getId()).orElse(null);
        if (wholesaler == null) {
            resp.put("success", false);
            resp.put("message", "Wholesaler profile not found");
            return ResponseEntity.badRequest().body(resp);
        }
        Retailer retailer = retailerRepository.findById(retailerId).orElse(null);
        if (retailer == null) {
            resp.put("success", false);
            resp.put("message", "Retailer not found");
            return ResponseEntity.badRequest().body(resp);
        }
        Optional<Connection> conn = connectionRepository.findByWholesalerAndRetailer(wholesaler, retailer);
        if (conn.isEmpty() || conn.get().getStatus() != Connection.Status.APPROVED) {
            resp.put("success", false);
            resp.put("message", "Retailer is not connected to your business");
            return ResponseEntity.status(403).body(resp);
        }

        Object raw = body != null ? body.get("creditLimit") : null;
        BigDecimal limit;
        if (raw == null) {
            limit = null;
        } else if (raw instanceof Number) {
            limit = BigDecimal.valueOf(((Number) raw).doubleValue());
            if (limit.compareTo(BigDecimal.ZERO) < 0) {
                resp.put("success", false);
                resp.put("message", "creditLimit cannot be negative");
                return ResponseEntity.badRequest().body(resp);
            }
        } else {
            resp.put("success", false);
            resp.put("message", "creditLimit must be a number or null");
            return ResponseEntity.badRequest().body(resp);
        }

        retailer.setCreditLimit(limit);
        retailerRepository.save(retailer);
        resp.put("success", true);
        resp.put("creditLimit", limit);
        return ResponseEntity.ok(resp);
    }
}
