package com.diya.backend.controller;

import com.diya.backend.dto.analytics.*;
import com.diya.backend.service.WholesalerBusinessAnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
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
    public List<TopSellingProductDTO> topProducts(
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(required = false) String region,
            @RequestParam(defaultValue = "THIS_MONTH") String period) {
        return analyticsService.getTopProducts(
                identifier(), Math.min(Math.max(limit, 1), 50), region, period);
    }

    @GetMapping("/slow-products")
    public List<SlowMovingProductDTO> slowProducts(
            @RequestParam(defaultValue = "30") int days,
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(required = false) String region,
            @RequestParam(defaultValue = "THIS_MONTH") String period) {
        return analyticsService.getSlowMovingProducts(
                identifier(),
                Math.min(Math.max(days, 1), 3650),
                Math.min(Math.max(limit, 1), 100),
                region,
                period);
    }

    @GetMapping("/top-retailers")
    public List<TopRetailerDTO> topRetailers(
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(required = false) String region,
            @RequestParam(defaultValue = "THIS_MONTH") String period) {
        return analyticsService.getTopRetailers(
                identifier(), Math.min(Math.max(limit, 1), 50), region, period);
    }

    @GetMapping("/pending-payments")
    public List<RetailerPendingPaymentDTO> pendingPayments(
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(required = false) String region) {
        return analyticsService.getRetailersWithPendingPayments(
                identifier(), Math.min(Math.max(limit, 1), 100), region);
    }

    /**
     * Sales trend (daily / weekly / monthly). Uses dashboard-aligned accepted-order sales.
     */
    @GetMapping("/sales-trend")
    public SalesTrendDTO salesTrend(
            @RequestParam(defaultValue = "MONTHLY") String granularity,
            @RequestParam(required = false) String region,
            @RequestParam(defaultValue = "THIS_MONTH") String period,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return analyticsService.getSalesTrend(identifier(), granularity, region, period, from, to);
    }

    /**
     * Retailer-wise sales share for a calendar month (paginated).
     */
    @GetMapping("/month-retailers")
    public MonthlyRetailerBreakdownDTO monthRetailers(
            @RequestParam int year,
            @RequestParam int month,
            @RequestParam(required = false) String region,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size) {
        return analyticsService.getMonthlyRetailerBreakdown(
                identifier(), year, month, region, page, Math.min(Math.max(size, 1), 50));
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
     * Orders placed in the KPI period (excludes rejected/cancelled), grouped by retailer region.
     */
    @GetMapping("/orders-by-region")
    public OrdersByRegionDTO ordersByRegion(
            @RequestParam(defaultValue = "THIS_MONTH") String period) {
        return analyticsService.getOrdersByRegion(identifier(), period);
    }

    /**
     * Region-wise revenue, outstanding, overdue, retailer counts, and GOLD / SILVER / RISK status.
     * Sorted by revenue (highest first).
     */
    @GetMapping("/territory-performance")
    public List<TerritoryPerformanceDTO> territoryPerformance() {
        return analyticsService.getTerritoryPerformance(identifier());
    }
}

