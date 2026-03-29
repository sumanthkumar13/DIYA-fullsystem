package com.diya.backend.controller;

import com.diya.backend.dto.analytics.*;
import com.diya.backend.service.WholesalerBusinessAnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
public class WholesalerBusinessAnalyticsController {

    private final WholesalerBusinessAnalyticsService analyticsService;

    private String identifier() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }

    @GetMapping("/summary")
    public AnalyticsSummaryDTO summary() {
        return analyticsService.getSummary(identifier());
    }

    @GetMapping("/top-products")
    public List<TopSellingProductDTO> topProducts(@RequestParam(defaultValue = "10") int limit) {
        return analyticsService.getTopProductsThisMonth(identifier(), Math.min(Math.max(limit, 1), 50));
    }

    @GetMapping("/slow-products")
    public List<SlowMovingProductDTO> slowProducts(
            @RequestParam(defaultValue = "30") int days,
            @RequestParam(defaultValue = "10") int limit) {
        return analyticsService.getSlowMovingProducts(identifier(), Math.min(Math.max(days, 1), 3650), Math.min(Math.max(limit, 1), 100));
    }

    @GetMapping("/top-retailers")
    public List<TopRetailerDTO> topRetailers(@RequestParam(defaultValue = "10") int limit) {
        return analyticsService.getTopRetailersThisMonth(identifier(), Math.min(Math.max(limit, 1), 50));
    }

    @GetMapping("/pending-payments")
    public List<RetailerPendingPaymentDTO> pendingPayments(@RequestParam(defaultValue = "10") int limit) {
        return analyticsService.getRetailersWithPendingPayments(identifier(), Math.min(Math.max(limit, 1), 100));
    }

    @GetMapping("/monthly-sales")
    public List<MonthlySalesDTO> monthlySales() {
        return analyticsService.getMonthlySalesLast12Months(identifier());
    }

    @GetMapping("/order-status")
    public OrderStatusSummaryDTO orderStatus() {
        return analyticsService.getOrderStatusSummary(identifier());
    }

    /**
     * Region-wise revenue, outstanding, overdue, retailer counts, and GOLD / SILVER / RISK status.
     *
     * @param sort {@code revenue} (default, highest first) or {@code risk} (highest overdue/revenue first)
     */
    @GetMapping("/territory-performance")
    public List<TerritoryPerformanceDTO> territoryPerformance(
            @RequestParam(defaultValue = "revenue") String sort) {
        return analyticsService.getTerritoryPerformance(identifier(), sort);
    }
}

