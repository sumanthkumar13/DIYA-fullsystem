package com.diya.backend.controller;

import com.diya.backend.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    // ✅ Wholesaler overview
    @GetMapping("/wholesaler/summary")
    public ResponseEntity<Map<String, Object>> getWholesalerSummary() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();
        return ResponseEntity.ok(analyticsService.getWholesalerSummary(email));
    }

    // ✅ Retailer overview
    @GetMapping("/retailer/summary")
    public ResponseEntity<Map<String, Object>> getRetailerSummary() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();
        return ResponseEntity.ok(analyticsService.getRetailerSummary(email));
    }

    // ✅ Monthly sales trend for wholesaler
    @GetMapping("/wholesaler/monthly-sales")
    public ResponseEntity<Map<String, Object>> getMonthlySalesTrend() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();
        return ResponseEntity.ok(analyticsService.getMonthlySales(email));
    }
}
