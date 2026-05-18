package com.diya.backend.service;

import com.diya.backend.dto.analytics.*;
import com.diya.backend.dto.dashboard.KpiTimePeriod;
import com.diya.backend.entity.Connection;
import com.diya.backend.entity.OrderItem;
import com.diya.backend.entity.Order;
import com.diya.backend.entity.Payment;
import com.diya.backend.entity.Product;
import com.diya.backend.entity.Retailer;
import com.diya.backend.entity.Wholesaler;
import com.diya.backend.repository.*;
import com.diya.backend.util.RegionCatalog;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.time.temporal.WeekFields;
import java.util.*;

@Service
@RequiredArgsConstructor
public class WholesalerBusinessAnalyticsService {

    private static final BigDecimal ZERO = BigDecimal.ZERO;
    private static final DateTimeFormatter DAY_LABEL =
            DateTimeFormatter.ofPattern("d MMM", Locale.forLanguageTag("en-IN"));
    private static final DateTimeFormatter MONTH_LABEL =
            DateTimeFormatter.ofPattern("MMM yyyy", Locale.forLanguageTag("en-IN"));

    private static final EnumSet<Order.Status> SALES_ELIGIBLE_STATUSES = EnumSet.of(
            Order.Status.ACCEPTED,
            Order.Status.PACKING,
            Order.Status.DISPATCHED,
            Order.Status.DELIVERED,
            Order.Status.COMPLETED,
            Order.Status.INVOICED);

    private final WholesalerRepository wholesalerRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final ProductRepository productRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final ConnectionRepository connectionRepository;
    private final PaymentRepository paymentRepository;

    private Wholesaler resolveWholesaler(String identifier) {
        return identifier.contains("@")
                ? wholesalerRepository.findByUserEmail(identifier)
                .orElseThrow(() -> new RuntimeException("Wholesaler not found"))
                : wholesalerRepository.findByUserPhone(identifier)
                .orElseThrow(() -> new RuntimeException("Wholesaler not found"));
    }

    public AnalyticsSummaryDTO getSummary(String identifier) {
        Wholesaler wholesaler = resolveWholesaler(identifier);

        LocalDate today = LocalDate.now();
        LocalDateTime todayStart = today.atStartOfDay();
        LocalDateTime tomorrowStart = today.plusDays(1).atStartOfDay();

        YearMonth ym = YearMonth.from(today);
        LocalDateTime monthStart = ym.atDay(1).atStartOfDay();
        LocalDateTime nextMonthStart = ym.plusMonths(1).atDay(1).atStartOfDay();

        BigDecimal todaySales = orderRepository.sumTotalAmountForWholesalerBetween(wholesaler, todayStart, tomorrowStart);
        BigDecimal monthSales = orderRepository.sumTotalAmountForWholesalerBetween(wholesaler, monthStart, nextMonthStart);
        long ordersThisMonth = orderRepository.countOrdersForWholesalerBetween(wholesaler, monthStart, nextMonthStart);

        BigDecimal outstanding = ledgerEntryRepository.outstandingForWholesaler(wholesaler);
        if (outstanding == null) {
            outstanding = ZERO;
        } else {
            // Never show negative outstanding; excess credits are treated as advance (not shown here).
            outstanding = outstanding.max(ZERO);
        }
        BigDecimal avg = BigDecimal.ZERO;
        if (ordersThisMonth > 0) {
            avg = monthSales.divide(BigDecimal.valueOf(ordersThisMonth), 2, RoundingMode.HALF_UP);
        }

        return AnalyticsSummaryDTO.builder()
                .todaySales(todaySales)
                .monthSales(monthSales)
                .outstandingPayments(outstanding)
                .ordersThisMonth(ordersThisMonth)
                .averageOrderValue(avg)
                .build();
    }

    public List<TopSellingProductDTO> getTopProductsThisMonth(String identifier, int limit) {
        return getTopProducts(identifier, limit, null, KpiTimePeriod.THIS_MONTH.name());
    }

    public List<TopSellingProductDTO> getTopProducts(
            String identifier, int limit, String regionFilter, String periodRaw) {
        Wholesaler wholesaler = resolveWholesaler(identifier);
        Set<UUID> scope = resolveRetailerScope(wholesaler, regionFilter);
        if (scope != null && scope.isEmpty()) {
            return List.of();
        }
        PeriodWindow pw = resolvePeriodWindow(KpiTimePeriod.parse(periodRaw));

        Map<UUID, ProductAccumulator> acc = new HashMap<>();
        for (Order o : orderRepository.findByWholesaler(wholesaler)) {
            if (!countsTowardSales(o)) {
                continue;
            }
            LocalDateTime at = o.getAcceptedAt();
            if (at == null || at.isBefore(pw.start) || !at.isBefore(pw.endExclusive)) {
                continue;
            }
            if (scope != null && (o.getRetailer() == null || !scope.contains(o.getRetailer().getId()))) {
                continue;
            }
            for (OrderItem oi : orderItemRepository.findByOrder(o)) {
                UUID pid = oi.getProductIdSnapshot();
                if (pid == null) {
                    continue;
                }
                ProductAccumulator a = acc.computeIfAbsent(pid, k -> new ProductAccumulator(
                        pid, oi.getProductNameSnapshot() != null ? oi.getProductNameSnapshot() : "Product"));
                long qty = oi.getQty() != null ? oi.getQty() : 0L;
                BigDecimal line = oi.getLineTotal() != null ? oi.getLineTotal() : ZERO;
                a.qty += qty;
                a.revenue = a.revenue.add(line);
            }
        }

        return acc.values().stream()
                .sorted(Comparator.comparing((ProductAccumulator a) -> a.revenue).reversed())
                .limit(limit)
                .map(a -> TopSellingProductDTO.builder()
                        .productId(a.productId)
                        .productName(a.name)
                        .totalQuantitySold(a.qty)
                        .totalRevenue(a.revenue)
                        .build())
                .toList();
    }

    private static final class ProductAccumulator {
        final UUID productId;
        final String name;
        long qty;
        BigDecimal revenue = ZERO;

        ProductAccumulator(UUID productId, String name) {
            this.productId = productId;
            this.name = name;
        }
    }

    public List<SlowMovingProductDTO> getSlowMovingProducts(String identifier, int daysThreshold, int limit) {
        return getSlowMovingProducts(identifier, daysThreshold, limit, null, KpiTimePeriod.THIS_MONTH.name());
    }

    public List<SlowMovingProductDTO> getSlowMovingProducts(
            String identifier, int daysThreshold, int limit, String regionFilter, String periodRaw) {
        Wholesaler wholesaler = resolveWholesaler(identifier);
        Set<UUID> scope = resolveRetailerScope(wholesaler, regionFilter);
        PeriodWindow pw = resolvePeriodWindow(KpiTimePeriod.parse(periodRaw));
        LocalDateTime cutoff = pw.endExclusive.minusDays(daysThreshold);

        Map<UUID, LocalDateTime> lastSoldMap = new HashMap<>();
        for (Order o : orderRepository.findByWholesaler(wholesaler)) {
            if (o.getStatus() == Order.Status.REJECTED || o.getStatus() == Order.Status.CANCELLED) {
                continue;
            }
            if (scope != null && (o.getRetailer() == null || !scope.contains(o.getRetailer().getId()))) {
                continue;
            }
            LocalDateTime soldAt = o.getAcceptedAt() != null ? o.getAcceptedAt() : o.getPlacedAt();
            if (soldAt == null) {
                continue;
            }
            for (OrderItem oi : orderItemRepository.findByOrder(o)) {
                UUID productId = oi.getProductIdSnapshot();
                if (productId == null) {
                    continue;
                }
                lastSoldMap.merge(productId, soldAt, (a, b) -> a.isAfter(b) ? a : b);
            }
        }

        List<Product> products = productRepository.findByWholesalerId(wholesaler.getId());
        List<SlowMovingProductDTO> candidates = new ArrayList<>();
        for (Product p : products) {
            LocalDateTime lastSoldAt = lastSoldMap.get(p.getId());
            boolean slow = (lastSoldAt == null) || lastSoldAt.isBefore(cutoff);
            if (!slow) continue;
            candidates.add(SlowMovingProductDTO.builder()
                    .productId(p.getId())
                    .productName(p.getName())
                    .currentStock(p.getStock() == null ? 0 : p.getStock())
                    .lastSoldAt(lastSoldAt)
                    .build());
        }

        candidates.sort((a, b) -> {
            // nulls first (never sold), then oldest sale first, then higher stock first
            if (a.getLastSoldAt() == null && b.getLastSoldAt() != null) return -1;
            if (a.getLastSoldAt() != null && b.getLastSoldAt() == null) return 1;
            if (a.getLastSoldAt() != null && b.getLastSoldAt() != null) {
                int cmp = a.getLastSoldAt().compareTo(b.getLastSoldAt());
                if (cmp != 0) return cmp;
            }
            return Integer.compare(b.getCurrentStock() == null ? 0 : b.getCurrentStock(),
                    a.getCurrentStock() == null ? 0 : a.getCurrentStock());
        });

        if (candidates.size() > limit) {
            return candidates.subList(0, limit);
        }
        return candidates;
    }

    public List<TopRetailerDTO> getTopRetailersThisMonth(String identifier, int limit) {
        return getTopRetailers(identifier, limit, null, KpiTimePeriod.THIS_MONTH.name());
    }

    public List<TopRetailerDTO> getTopRetailersThisMonth(String identifier, int limit, String regionFilter) {
        return getTopRetailers(identifier, limit, regionFilter, KpiTimePeriod.THIS_MONTH.name());
    }

    public List<TopRetailerDTO> getTopRetailers(
            String identifier, int limit, String regionFilter, String periodRaw) {
        Wholesaler wholesaler = resolveWholesaler(identifier);
        Set<UUID> scope = resolveRetailerScope(wholesaler, regionFilter);
        if (scope != null && scope.isEmpty()) {
            return List.of();
        }
        PeriodWindow pw = resolvePeriodWindow(KpiTimePeriod.parse(periodRaw));

        Map<UUID, BigDecimal> outstandingByRetailer = new HashMap<>();
        for (Object[] row : ledgerEntryRepository.retailersWithOutstandingForWholesaler(wholesaler)) {
            BigDecimal amt = (BigDecimal) row[2];
            outstandingByRetailer.put((UUID) row[0], amt != null ? amt.max(ZERO) : ZERO);
        }

        Map<UUID, RetailerAccumulator> acc = new HashMap<>();
        for (Order o : orderRepository.findByWholesaler(wholesaler)) {
            if (!countsTowardSales(o)) {
                continue;
            }
            LocalDateTime at = o.getAcceptedAt();
            if (at == null || at.isBefore(pw.start) || !at.isBefore(pw.endExclusive)) {
                continue;
            }
            if (o.getRetailer() == null || o.getRetailer().getId() == null) {
                continue;
            }
            UUID rid = o.getRetailer().getId();
            if (scope != null && !scope.contains(rid)) {
                continue;
            }
            RetailerAccumulator a = acc.computeIfAbsent(rid, k -> new RetailerAccumulator(
                    rid, retailerShopDisplayName(o.getRetailer())));
            a.orders++;
            a.revenue = a.revenue.add(o.getTotalAmount() != null ? o.getTotalAmount() : ZERO);
        }

        return acc.values().stream()
                .sorted(Comparator.comparing((RetailerAccumulator a) -> a.revenue).reversed())
                .limit(limit)
                .map(a -> {
                    BigDecimal avg = a.orders > 0
                            ? a.revenue.divide(BigDecimal.valueOf(a.orders), 2, RoundingMode.HALF_UP)
                            : ZERO;
                    return TopRetailerDTO.builder()
                            .retailerId(a.retailerId)
                            .retailerName(a.name)
                            .totalOrders(a.orders)
                            .totalRevenue(a.revenue)
                            .outstandingDue(outstandingByRetailer.getOrDefault(a.retailerId, ZERO))
                            .averageOrderValue(avg)
                            .build();
                })
                .toList();
    }

    private static final class RetailerAccumulator {
        final UUID retailerId;
        final String name;
        long orders;
        BigDecimal revenue = ZERO;

        RetailerAccumulator(UUID retailerId, String name) {
            this.retailerId = retailerId;
            this.name = name;
        }
    }

    public List<RetailerPendingPaymentDTO> getRetailersWithPendingPayments(String identifier, int limit) {
        return getRetailersWithPendingPayments(identifier, limit, null);
    }

    public List<RetailerPendingPaymentDTO> getRetailersWithPendingPayments(String identifier, int limit, String regionFilter) {
        Wholesaler wholesaler = resolveWholesaler(identifier);
        Set<UUID> scope = resolveRetailerScope(wholesaler, regionFilter);
        if (scope != null && scope.isEmpty()) {
            return List.of();
        }

        Map<UUID, LocalDateTime> lastPaymentMap = new HashMap<>();
        for (Object[] r : ledgerEntryRepository.lastPaymentAtByRetailerForWholesaler(wholesaler)) {
            lastPaymentMap.put((UUID) r[0], (LocalDateTime) r[1]);
        }

        List<Object[]> rows = ledgerEntryRepository.retailersWithOutstandingForWholesaler(wholesaler);
        List<RetailerPendingPaymentDTO> out = new ArrayList<>();
        for (Object[] r : rows) {
            UUID retailerId = (UUID) r[0];
            if (scope != null && !scope.contains(retailerId)) {
                continue;
            }
            out.add(RetailerPendingPaymentDTO.builder()
                    .retailerId(retailerId)
                    .retailerName((String) r[1])
                    .outstandingAmount((BigDecimal) r[2])
                    .lastPaymentAt(lastPaymentMap.get(retailerId))
                    .build());
            if (out.size() >= limit) break;
        }
        return out;
    }

    public List<MonthlySalesDTO> getMonthlySalesLast12Months(String identifier) {
        Wholesaler wholesaler = resolveWholesaler(identifier);

        YearMonth thisMonth = YearMonth.now();
        YearMonth start = thisMonth.minusMonths(11);
        LocalDateTime from = start.atDay(1).atStartOfDay();

        Map<YearMonth, MonthlySalesDTO> map = new LinkedHashMap<>();
        YearMonth cursor = start;
        for (int i = 0; i < 12; i++) {
            map.put(cursor, MonthlySalesDTO.builder()
                    .year(cursor.getYear())
                    .month(cursor.getMonthValue())
                    .totalRevenue(BigDecimal.ZERO)
                    .totalOrders(0)
                    .build());
            cursor = cursor.plusMonths(1);
        }

        List<Object[]> rows = orderRepository.monthlySalesSince(wholesaler, from);
        for (Object[] r : rows) {
            int year = ((Number) r[0]).intValue();
            int month = ((Number) r[1]).intValue();
            BigDecimal revenue = (BigDecimal) r[2];
            long orders = ((Number) r[3]).longValue();
            YearMonth ym = YearMonth.of(year, month);
            MonthlySalesDTO dto = map.get(ym);
            if (dto != null) {
                dto.setTotalRevenue(revenue);
                dto.setTotalOrders(orders);
            }
        }

        return new ArrayList<>(map.values());
    }

    public OrderStatusSummaryDTO getOrderStatusSummary(String identifier) {
        Wholesaler wholesaler = resolveWholesaler(identifier);

        List<Order.Status> pending = List.of(Order.Status.PLACED, Order.Status.ACCEPTED, Order.Status.PACKING);
        List<Order.Status> delivered = List.of(Order.Status.DELIVERED, Order.Status.COMPLETED);

        Object[] r = orderRepository.orderStatusBuckets(wholesaler, pending, delivered);
        long pendingCount = r[0] == null ? 0 : ((Number) r[0]).longValue();
        long dispatchedCount = r[1] == null ? 0 : ((Number) r[1]).longValue();
        long deliveredCount = r[2] == null ? 0 : ((Number) r[2]).longValue();

        return OrderStatusSummaryDTO.builder()
                .pendingOrders(pendingCount)
                .dispatchedOrders(dispatchedCount)
                .deliveredOrders(deliveredCount)
                .build();
    }

    /**
     * Region-level intelligence: revenue, collections risk, and retailer activity for this wholesaler.
     */
    public List<TerritoryPerformanceDTO> getTerritoryPerformance(String identifier) {
        Wholesaler wholesaler = resolveWholesaler(identifier);

        List<Connection> approved = connectionRepository.findByWholesalerAndStatusOrderByRequestedAtDesc(
                wholesaler, Connection.Status.APPROVED);
        // Scope analytics strictly to connected retailers + their persisted `retailer.region`.
        Map<UUID, Retailer> connectedRetailers = new HashMap<>();
        Map<UUID, String> regionByRetailerId = new HashMap<>();
        for (Connection c : approved) {
            Retailer r = c.getRetailer();
            if (r == null || r.getId() == null) continue;
            String region = RegionCatalog.normalize(r.getRegion());
            // No free-text region: ignore empty regions to avoid creating mock analytics buckets.
            if (region.isEmpty()) continue;
            connectedRetailers.put(r.getId(), r);
            regionByRetailerId.put(r.getId(), region);
        }

        if (regionByRetailerId.isEmpty()) {
            return new ArrayList<>();
        }

        // Payments: confirmed payments only.
        List<Order> allOrders = orderRepository.findByWholesaler(wholesaler);
        List<Payment> allPayments = paymentRepository.findByWholesaler(wholesaler);
        Map<UUID, BigDecimal> paidByOrderId = new HashMap<>();
        for (Payment p : allPayments) {
            if (p.getOrder() == null || p.getStatus() != Payment.PaymentStatus.CONFIRMED) continue;
            UUID oid = p.getOrder().getId();
            BigDecimal amt = p.getAmount() == null ? ZERO : p.getAmount();
            paidByOrderId.merge(oid, amt, BigDecimal::add);
        }

        // Accepted order statuses only (PLACED and REJECTED/CANCELLED excluded).
        EnumSet<Order.Status> acceptedStatuses = EnumSet.of(
                Order.Status.ACCEPTED,
                Order.Status.PACKING,
                Order.Status.DISPATCHED,
                Order.Status.DELIVERED,
                Order.Status.COMPLETED,
                Order.Status.INVOICED
        );

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime sevenDaysAgo = now.minusDays(7);

        // Per-retailer accumulators.
        Map<UUID, BigDecimal> revenueByRetailerId = new HashMap<>();
        Map<UUID, BigDecimal> outstandingByRetailerId = new HashMap<>();
        Map<UUID, BigDecimal> pastDueByRetailerId = new HashMap<>();
        Map<UUID, Boolean> activeByRetailerId = new HashMap<>();
        for (UUID rid : regionByRetailerId.keySet()) {
            revenueByRetailerId.put(rid, ZERO);
            outstandingByRetailerId.put(rid, ZERO);
            pastDueByRetailerId.put(rid, ZERO);
            activeByRetailerId.put(rid, false);
        }

        for (Order o : allOrders) {
            if (o == null || o.getRetailer() == null || o.getRetailer().getId() == null) continue;
            UUID retailerId = o.getRetailer().getId();
            if (!regionByRetailerId.containsKey(retailerId)) continue;

            Order.Status st = o.getStatus();
            if (st != Order.Status.REJECTED
                    && st != Order.Status.CANCELLED
                    && o.getPlacedAt() != null
                    && !o.getPlacedAt().isBefore(sevenDaysAgo)
                    && !o.getPlacedAt().isAfter(now)
                    && activeByRetailerId.getOrDefault(retailerId, false) == Boolean.FALSE) {
                activeByRetailerId.put(retailerId, true);
            }

            if (!acceptedStatuses.contains(st)) continue;

            BigDecimal total = o.getTotalAmount() == null ? ZERO : o.getTotalAmount();
            BigDecimal paid = paidByOrderId.getOrDefault(o.getId(), ZERO);
            BigDecimal out = total.subtract(paid).max(ZERO);

            revenueByRetailerId.merge(retailerId, total, BigDecimal::add);
            outstandingByRetailerId.merge(retailerId, out, BigDecimal::add);

            LocalDateTime due = effectiveCreditDue(o);
            if (due != null && due.isBefore(now) && out.compareTo(ZERO) > 0) {
                pastDueByRetailerId.merge(retailerId, out, BigDecimal::add);
            }
        }

        // Aggregate by region: GROUP BY retailer.region (normalized).
        Map<String, BigDecimal> revenueByRegion = new HashMap<>();
        Map<String, BigDecimal> outstandingByRegion = new HashMap<>();
        Map<String, BigDecimal> overdueByRegion = new HashMap<>();
        Map<String, Integer> activeRetailersByRegion = new HashMap<>();
        Map<String, Integer> totalRetailersByRegion = new HashMap<>();

        for (UUID retailerId : regionByRetailerId.keySet()) {
            String region = regionByRetailerId.get(retailerId);
            totalRetailersByRegion.merge(region, 1, Integer::sum);

            BigDecimal revenue = revenueByRetailerId.getOrDefault(retailerId, ZERO);
            BigDecimal outstanding = outstandingByRetailerId.getOrDefault(retailerId, ZERO);
            BigDecimal pastDue = pastDueByRetailerId.getOrDefault(retailerId, ZERO);

            // Overdue should strictly represent past-due (due date crossed) amounts.
            // Credit-limit exceed can be surfaced separately as "risk", but should not inflate overdue totals.
            BigDecimal overdue = pastDue;

            revenueByRegion.merge(region, revenue, BigDecimal::add);
            outstandingByRegion.merge(region, outstanding, BigDecimal::add);
            overdueByRegion.merge(region, overdue, BigDecimal::add);

            if (activeByRetailerId.getOrDefault(retailerId, false)) {
                activeRetailersByRegion.merge(region, 1, Integer::sum);
            }
        }

        List<TerritoryPerformanceDTO> rows = new ArrayList<>();
        for (String region : totalRetailersByRegion.keySet()) {
            BigDecimal revenue = revenueByRegion.getOrDefault(region, ZERO);
            BigDecimal outstanding = outstandingByRegion.getOrDefault(region, ZERO);
            BigDecimal overdue = overdueByRegion.getOrDefault(region, ZERO);

            String status = classifyTerritoryStatus(revenue, outstanding, overdue);
            rows.add(TerritoryPerformanceDTO.builder()
                    .region(region)
                    .revenue(revenue)
                    .outstanding(outstanding)
                    .overdue(overdue)
                    .activeRetailers(activeRetailersByRegion.getOrDefault(region, 0))
                    .totalRetailers(totalRetailersByRegion.getOrDefault(region, 0))
                    .status(status)
                    .build());
        }

        rows.sort((a, b) -> b.getRevenue().compareTo(a.getRevenue()));
        return rows;
    }

    /**
     * Order counts grouped by retailer region for the selected KPI period.
     * Counts orders placed in the window (aligned with dashboard NEW_ORDERS), excluding
     * REJECTED and CANCELLED only. Region comes from each retailer's profile; missing
     * region is bucketed as "Unassigned".
     */
    public OrdersByRegionDTO getOrdersByRegion(String identifier, String periodRaw) {
        Wholesaler wholesaler = resolveWholesaler(identifier);
        PeriodWindow pw = resolvePeriodWindow(KpiTimePeriod.parse(periodRaw));

        Map<String, Long> countsByRegion = new LinkedHashMap<>();
        long total = 0;
        for (Order o : orderRepository.findByWholesaler(wholesaler)) {
            if (!countsAsReceivedOrder(o)) {
                continue;
            }
            LocalDateTime placed = o.getPlacedAt();
            if (placed.isBefore(pw.start) || !placed.isBefore(pw.endExclusive)) {
                continue;
            }
            if (o.getRetailer() == null || o.getRetailer().getId() == null) {
                continue;
            }
            String region = retailerRegionLabel(o.getRetailer());
            countsByRegion.merge(region, 1L, Long::sum);
            total++;
        }

        List<RegionOrderCountDTO> regions = countsByRegion.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed()
                        .thenComparing(Map.Entry.comparingByKey()))
                .map(e -> RegionOrderCountDTO.builder()
                        .region(e.getKey())
                        .orderCount(e.getValue())
                        .build())
                .toList();

        return OrdersByRegionDTO.builder()
                .totalOrders(total)
                .regions(regions)
                .build();
    }

    /**
     * Sales trend buckets using the same accepted-order sales rules as the dashboard KPI.
     */
    public SalesTrendDTO getSalesTrend(
            String identifier,
            String granularityRaw,
            String regionFilter,
            LocalDate fromDate,
            LocalDate toDate) {
        return getSalesTrend(identifier, granularityRaw, regionFilter, KpiTimePeriod.THIS_MONTH.name(), fromDate, toDate);
    }

    public SalesTrendDTO getSalesTrend(
            String identifier,
            String granularityRaw,
            String regionFilter,
            String periodRaw,
            LocalDate fromDate,
            LocalDate toDate) {
        Wholesaler wholesaler = resolveWholesaler(identifier);
        Set<UUID> scope = resolveRetailerScope(wholesaler, regionFilter);
        if (scope != null && scope.isEmpty()) {
            return SalesTrendDTO.builder()
                    .granularity(normalizeGranularity(granularityRaw))
                    .points(List.of())
                    .totalRevenue(ZERO)
                    .comparisonRevenue(ZERO)
                    .build();
        }

        String granularity = normalizeGranularity(granularityRaw);
        PeriodWindow pw = resolvePeriodWindow(KpiTimePeriod.parse(periodRaw));
        LocalDate rangeStart = fromDate != null ? fromDate : pw.start.toLocalDate();
        LocalDate rangeEnd = toDate != null ? toDate : pw.endExclusive.toLocalDate().minusDays(1);

        if (rangeStart.isAfter(rangeEnd)) {
            LocalDate tmp = rangeStart;
            rangeStart = rangeEnd;
            rangeEnd = tmp;
        }

        LinkedHashMap<String, SalesTrendPointDTO> buckets = buildTrendBuckets(granularity, rangeStart, rangeEnd);
        LocalDateTime windowStart = rangeStart.atStartOfDay();
        LocalDateTime windowEndExclusive = rangeEnd.plusDays(1).atStartOfDay();

        BigDecimal comparisonRevenue = sumSalesBetween(wholesaler, scope, pw.compStart, pw.compEndExclusive);

        BigDecimal total = ZERO;
        for (Order o : orderRepository.findByWholesaler(wholesaler)) {
            if (!countsTowardSales(o)) {
                continue;
            }
            LocalDateTime at = o.getAcceptedAt();
            if (at == null || at.isBefore(windowStart) || !at.isBefore(windowEndExclusive)) {
                continue;
            }
            if (scope != null && (o.getRetailer() == null || !scope.contains(o.getRetailer().getId()))) {
                continue;
            }
            String key = trendBucketKey(granularity, at.toLocalDate());
            SalesTrendPointDTO point = buckets.get(key);
            if (point == null) {
                continue;
            }
            BigDecimal amt = o.getTotalAmount() != null ? o.getTotalAmount() : ZERO;
            point.setRevenue(point.getRevenue().add(amt));
            point.setOrderCount(point.getOrderCount() + 1);
            total = total.add(amt);
        }

        return SalesTrendDTO.builder()
                .granularity(granularity)
                .points(new ArrayList<>(buckets.values()))
                .totalRevenue(total)
                .comparisonRevenue(comparisonRevenue)
                .build();
    }

    public MonthlyRetailerBreakdownDTO getMonthlyRetailerBreakdown(
            String identifier,
            int year,
            int month,
            String regionFilter,
            int page,
            int size) {
        Wholesaler wholesaler = resolveWholesaler(identifier);
        Set<UUID> scope = resolveRetailerScope(wholesaler, regionFilter);
        YearMonth ym = YearMonth.of(year, month);
        LocalDateTime from = ym.atDay(1).atStartOfDay();
        LocalDateTime to = ym.plusMonths(1).atDay(1).atStartOfDay();

        Map<UUID, BigDecimal> sums = new LinkedHashMap<>();
        Map<UUID, Retailer> retailers = new HashMap<>();
        for (Order o : orderRepository.findByWholesaler(wholesaler)) {
            if (!countsTowardSales(o)) {
                continue;
            }
            LocalDateTime at = o.getAcceptedAt();
            if (at == null || at.isBefore(from) || !at.isBefore(to)) {
                continue;
            }
            if (o.getRetailer() == null || o.getRetailer().getId() == null) {
                continue;
            }
            UUID rid = o.getRetailer().getId();
            if (scope != null && !scope.contains(rid)) {
                continue;
            }
            BigDecimal amt = o.getTotalAmount() != null ? o.getTotalAmount() : ZERO;
            sums.merge(rid, amt, BigDecimal::add);
            retailers.putIfAbsent(rid, o.getRetailer());
        }

        BigDecimal monthTotal = sums.values().stream().reduce(ZERO, BigDecimal::add);
        List<RetailerSalesContributionDTO> all = sums.entrySet().stream()
                .map(e -> {
                    BigDecimal amt = e.getValue();
                    double pct = monthTotal.compareTo(ZERO) > 0
                            ? amt.multiply(BigDecimal.valueOf(100))
                                    .divide(monthTotal, 2, RoundingMode.HALF_UP)
                                    .doubleValue()
                            : 0d;
                    return RetailerSalesContributionDTO.builder()
                            .retailerId(e.getKey())
                            .shopName(retailerShopDisplayName(retailers.get(e.getKey())))
                            .amount(amt)
                            .percentage(pct)
                            .build();
                })
                .sorted(Comparator.comparing(
                        RetailerSalesContributionDTO::getAmount,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();

        int p = Math.max(0, page);
        int s = Math.min(50, Math.max(1, size));
        long total = all.size();
        int fromIdx = (int) Math.min(total, (long) p * s);
        int toIdx = (int) Math.min(total, fromIdx + (long) s);
        List<RetailerSalesContributionDTO> slice = fromIdx >= toIdx ? List.of() : all.subList(fromIdx, toIdx);
        int totalPages = total == 0 ? 1 : (int) Math.ceil(total / (double) s);

        return MonthlyRetailerBreakdownDTO.builder()
                .year(year)
                .month(month)
                .monthLabel(ym.atDay(1).format(MONTH_LABEL))
                .monthTotal(monthTotal)
                .content(slice)
                .page(p)
                .size(s)
                .totalElements(total)
                .totalPages(totalPages)
                .build();
    }

    private static String normalizeGranularity(String raw) {
        if (raw == null || raw.isBlank()) {
            return "MONTHLY";
        }
        return switch (raw.trim().toUpperCase(Locale.ROOT)) {
            case "DAILY", "DAY" -> "DAILY";
            case "WEEKLY", "WEEK" -> "WEEKLY";
            default -> "MONTHLY";
        };
    }

    private static LocalDate defaultTrendStart(String granularity, LocalDate rangeEnd) {
        return switch (granularity) {
            case "DAILY" -> rangeEnd.minusDays(29);
            case "WEEKLY" -> rangeEnd.minusWeeks(11).with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            default -> rangeEnd.minusMonths(11).withDayOfMonth(1);
        };
    }

    private LinkedHashMap<String, SalesTrendPointDTO> buildTrendBuckets(
            String granularity, LocalDate rangeStart, LocalDate rangeEnd) {
        LinkedHashMap<String, SalesTrendPointDTO> map = new LinkedHashMap<>();
        switch (granularity) {
            case "DAILY" -> {
                LocalDate d = rangeStart;
                while (!d.isAfter(rangeEnd)) {
                    String key = trendBucketKey("DAILY", d);
                    map.put(key, SalesTrendPointDTO.builder()
                            .label(d.format(DAY_LABEL))
                            .key(key)
                            .year(d.getYear())
                            .month(d.getMonthValue())
                            .day(d.getDayOfMonth())
                            .revenue(ZERO)
                            .orderCount(0)
                            .build());
                    d = d.plusDays(1);
                }
            }
            case "WEEKLY" -> {
                LocalDate d = rangeStart.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
                LocalDate end = rangeEnd.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
                WeekFields wf = WeekFields.of(Locale.forLanguageTag("en-IN"));
                while (!d.isAfter(end)) {
                    String key = trendBucketKey("WEEKLY", d);
                    int week = d.get(wf.weekOfWeekBasedYear());
                    map.put(key, SalesTrendPointDTO.builder()
                            .label("W" + week + " · " + d.format(DAY_LABEL))
                            .key(key)
                            .year(d.getYear())
                            .month(d.getMonthValue())
                            .day(d.getDayOfMonth())
                            .revenue(ZERO)
                            .orderCount(0)
                            .build());
                    d = d.plusWeeks(1);
                }
            }
            default -> {
                YearMonth start = YearMonth.from(rangeStart);
                YearMonth end = YearMonth.from(rangeEnd);
                YearMonth cursor = start;
                while (!cursor.isAfter(end)) {
                    LocalDate first = cursor.atDay(1);
                    String key = trendBucketKey("MONTHLY", first);
                    map.put(key, SalesTrendPointDTO.builder()
                            .label(cursor.atDay(1).format(MONTH_LABEL))
                            .key(key)
                            .year(cursor.getYear())
                            .month(cursor.getMonthValue())
                            .day(1)
                            .revenue(ZERO)
                            .orderCount(0)
                            .build());
                    cursor = cursor.plusMonths(1);
                }
            }
        }
        return map;
    }

    private static String trendBucketKey(String granularity, LocalDate date) {
        return switch (granularity) {
            case "DAILY" -> String.format(Locale.ROOT, "%04d-%02d-%02d", date.getYear(), date.getMonthValue(), date.getDayOfMonth());
            case "WEEKLY" -> {
                LocalDate mon = date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
                yield String.format(Locale.ROOT, "%04d-%02d-%02d", mon.getYear(), mon.getMonthValue(), mon.getDayOfMonth());
            }
            default -> String.format(Locale.ROOT, "%04d-%02d", date.getYear(), date.getMonthValue());
        };
    }

    private BigDecimal sumSalesBetween(
            Wholesaler wholesaler, Set<UUID> scope, LocalDateTime startInclusive, LocalDateTime endExclusive) {
        BigDecimal sum = ZERO;
        for (Order o : orderRepository.findByWholesaler(wholesaler)) {
            if (!countsTowardSales(o)) {
                continue;
            }
            LocalDateTime at = o.getAcceptedAt();
            if (at == null || at.isBefore(startInclusive) || !at.isBefore(endExclusive)) {
                continue;
            }
            if (scope != null && (o.getRetailer() == null || !scope.contains(o.getRetailer().getId()))) {
                continue;
            }
            sum = sum.add(o.getTotalAmount() != null ? o.getTotalAmount() : ZERO);
        }
        return sum;
    }

    private static boolean countsTowardSales(Order o) {
        return o != null
                && o.getStatus() != null
                && SALES_ELIGIBLE_STATUSES.contains(o.getStatus())
                && o.getAcceptedAt() != null;
    }

    /** Orders received by the wholesaler (placed), excluding rejected/cancelled. */
    private static boolean countsAsReceivedOrder(Order o) {
        return o != null
                && o.getStatus() != null
                && o.getStatus() != Order.Status.REJECTED
                && o.getStatus() != Order.Status.CANCELLED
                && o.getPlacedAt() != null;
    }

    private static String retailerRegionLabel(Retailer retailer) {
        if (retailer == null) {
            return "Unassigned";
        }
        String region = RegionCatalog.normalize(retailer.getRegion());
        return region.isEmpty() ? "Unassigned" : region;
    }

    /** Mirrors {@link com.diya.backend.service.DashboardService} KPI period windows. */
    private static PeriodWindow resolvePeriodWindow(KpiTimePeriod period) {
        LocalDate today = LocalDate.now();
        return switch (period) {
            case TODAY -> {
                LocalDateTime st = today.atStartOfDay();
                LocalDateTime en = today.plusDays(1).atStartOfDay();
                LocalDate y = today.minusDays(1);
                yield new PeriodWindow(st, en, y.atStartOfDay(), y.plusDays(1).atStartOfDay());
            }
            case YESTERDAY -> {
                LocalDate y = today.minusDays(1);
                LocalDate db = today.minusDays(2);
                LocalDateTime st = y.atStartOfDay();
                LocalDateTime en = y.plusDays(1).atStartOfDay();
                yield new PeriodWindow(st, en, db.atStartOfDay(), db.plusDays(1).atStartOfDay());
            }
            case THIS_WEEK -> {
                LocalDate mon = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
                LocalDateTime st = mon.atStartOfDay();
                LocalDateTime en = today.plusDays(1).atStartOfDay();
                LocalDate prevMon = mon.minusWeeks(1);
                long days = ChronoUnit.DAYS.between(mon, today) + 1;
                LocalDateTime cst = prevMon.atStartOfDay();
                LocalDateTime cen = prevMon.plusDays(days).atStartOfDay();
                yield new PeriodWindow(st, en, cst, cen);
            }
            case THIS_MONTH -> {
                LocalDate first = today.withDayOfMonth(1);
                LocalDateTime st = first.atStartOfDay();
                LocalDateTime en = today.plusDays(1).atStartOfDay();
                LocalDate prevFirst = first.minusMonths(1);
                int dom = today.getDayOfMonth();
                int maxPrev = prevFirst.lengthOfMonth();
                int endDay = Math.min(dom, maxPrev);
                LocalDate compEndDate = prevFirst.withDayOfMonth(endDay);
                yield new PeriodWindow(st, en, prevFirst.atStartOfDay(), compEndDate.plusDays(1).atStartOfDay());
            }
        };
    }

    private static final class PeriodWindow {
        final LocalDateTime start;
        final LocalDateTime endExclusive;
        final LocalDateTime compStart;
        final LocalDateTime compEndExclusive;

        PeriodWindow(
                LocalDateTime start,
                LocalDateTime endExclusive,
                LocalDateTime compStart,
                LocalDateTime compEndExclusive) {
            this.start = start;
            this.endExclusive = endExclusive;
            this.compStart = compStart;
            this.compEndExclusive = compEndExclusive;
        }
    }

    private Set<UUID> resolveRetailerScope(Wholesaler wholesaler, String regionFilter) {
        if (regionFilter == null || regionFilter.isBlank()
                || "all".equalsIgnoreCase(regionFilter.trim())) {
            return null;
        }
        String want = RegionCatalog.normalize(regionFilter.trim());
        Set<UUID> ids = new HashSet<>();
        for (Connection c : connectionRepository.findByWholesalerAndStatusOrderByRequestedAtDesc(
                wholesaler, Connection.Status.APPROVED)) {
            Retailer r = c.getRetailer();
            if (r == null) {
                continue;
            }
            if (want.equals(RegionCatalog.normalize(r.getRegion()))) {
                ids.add(r.getId());
            }
        }
        return ids;
    }

    private String retailerShopDisplayName(Retailer r) {
        if (r == null) {
            return "Retailer";
        }
        String shop = r.getShopName() != null ? r.getShopName().trim() : "";
        if (!shop.isEmpty()) {
            return shop;
        }
        if (r.getUser() != null && r.getUser().getName() != null && !r.getUser().getName().isBlank()) {
            return r.getUser().getName().trim();
        }
        return "Retailer";
    }

    private static LocalDateTime effectiveCreditDue(Order o) {
        if (o.getCreditDueDate() != null) {
            return o.getCreditDueDate();
        }
        if (o.getDueDate() != null) {
            return o.getDueDate();
        }
        int cd = o.getCreditDays() != null ? o.getCreditDays() : 0;
        if (cd > 0 && o.getPlacedAt() != null) {
            return o.getPlacedAt().plusDays(cd);
        }
        return null;
    }

    /**
     * riskRatio = overdue / revenue (when revenue &gt; 0). Also flags very high outstanding vs revenue as RISK.
     */
    private static String classifyTerritoryStatus(BigDecimal revenue, BigDecimal outstanding, BigDecimal overdue) {
        BigDecimal rev = revenue == null ? ZERO : revenue;
        BigDecimal out = outstanding == null ? ZERO : outstanding;
        BigDecimal od = overdue == null ? ZERO : overdue;

        if (rev.compareTo(ZERO) <= 0) {
            if (od.compareTo(ZERO) > 0 || out.compareTo(ZERO) > 0) {
                return "RISK";
            }
            return "SILVER";
        }

        if (out.compareTo(rev) > 0) {
            return "RISK";
        }

        BigDecimal riskRatio = od.divide(rev, 4, RoundingMode.HALF_UP);
        if (riskRatio.compareTo(new BigDecimal("0.5")) > 0) {
            return "RISK";
        }
        if (riskRatio.compareTo(new BigDecimal("0.2")) < 0) {
            return "GOLD";
        }
        return "SILVER";
    }
}

