package com.diya.backend.service;

import com.diya.backend.dto.analytics.*;
import com.diya.backend.entity.Connection;
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
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.*;

@Service
@RequiredArgsConstructor
public class WholesalerBusinessAnalyticsService {

    private static final BigDecimal ZERO = BigDecimal.ZERO;

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
        Wholesaler wholesaler = resolveWholesaler(identifier);

        LocalDate today = LocalDate.now();
        YearMonth ym = YearMonth.from(today);
        LocalDateTime from = ym.atDay(1).atStartOfDay();
        LocalDateTime to = ym.plusMonths(1).atDay(1).atStartOfDay();

        List<Object[]> rows = orderItemRepository.topProductsForWholesalerBetween(wholesaler, from, to);
        List<TopSellingProductDTO> out = new ArrayList<>();
        for (Object[] r : rows) {
            out.add(TopSellingProductDTO.builder()
                    .productId((UUID) r[0])
                    .productName((String) r[1])
                    .totalQuantitySold(((Number) r[2]).longValue())
                    .totalRevenue((BigDecimal) r[3])
                    .build());
            if (out.size() >= limit) break;
        }
        return out;
    }

    public List<SlowMovingProductDTO> getSlowMovingProducts(String identifier, int daysThreshold, int limit) {
        Wholesaler wholesaler = resolveWholesaler(identifier);

        LocalDateTime cutoff = LocalDateTime.now().minusDays(daysThreshold);

        Map<UUID, LocalDateTime> lastSoldMap = new HashMap<>();
        for (Object[] r : orderItemRepository.lastSoldAtByProductForWholesaler(wholesaler)) {
            UUID productId = (UUID) r[0];
            LocalDateTime lastSoldAt = (LocalDateTime) r[1];
            lastSoldMap.put(productId, lastSoldAt);
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
        Wholesaler wholesaler = resolveWholesaler(identifier);

        LocalDate today = LocalDate.now();
        YearMonth ym = YearMonth.from(today);
        LocalDateTime from = ym.atDay(1).atStartOfDay();
        LocalDateTime to = ym.plusMonths(1).atDay(1).atStartOfDay();

        List<Object[]> rows = orderRepository.topRetailersForWholesalerBetween(wholesaler, from, to);
        List<TopRetailerDTO> out = new ArrayList<>();
        for (Object[] r : rows) {
            out.add(TopRetailerDTO.builder()
                    .retailerId((UUID) r[0])
                    .retailerName((String) r[1])
                    .totalOrders(((Number) r[2]).longValue())
                    .totalRevenue((BigDecimal) r[3])
                    .build());
            if (out.size() >= limit) break;
        }
        return out;
    }

    public List<RetailerPendingPaymentDTO> getRetailersWithPendingPayments(String identifier, int limit) {
        Wholesaler wholesaler = resolveWholesaler(identifier);

        Map<UUID, LocalDateTime> lastPaymentMap = new HashMap<>();
        for (Object[] r : ledgerEntryRepository.lastPaymentAtByRetailerForWholesaler(wholesaler)) {
            lastPaymentMap.put((UUID) r[0], (LocalDateTime) r[1]);
        }

        List<Object[]> rows = ledgerEntryRepository.retailersWithOutstandingForWholesaler(wholesaler);
        List<RetailerPendingPaymentDTO> out = new ArrayList<>();
        for (Object[] r : rows) {
            UUID retailerId = (UUID) r[0];
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
    public List<TerritoryPerformanceDTO> getTerritoryPerformance(String identifier, String sort) {
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
        LocalDateTime thirtyDaysAgo = now.minusDays(30);

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
            if (!acceptedStatuses.contains(o.getStatus())) continue;

            BigDecimal total = o.getTotalAmount() == null ? ZERO : o.getTotalAmount();
            BigDecimal paid = paidByOrderId.getOrDefault(o.getId(), ZERO);
            BigDecimal out = total.subtract(paid).max(ZERO);

            revenueByRetailerId.merge(retailerId, total, BigDecimal::add);
            outstandingByRetailerId.merge(retailerId, out, BigDecimal::add);

            LocalDateTime due = effectiveCreditDue(o);
            if (due != null && due.isBefore(now) && out.compareTo(ZERO) > 0) {
                pastDueByRetailerId.merge(retailerId, out, BigDecimal::add);
            }

            if (o.getPlacedAt() != null
                    && !o.getPlacedAt().isBefore(thirtyDaysAgo)
                    && !o.getPlacedAt().isAfter(now)
                    && activeByRetailerId.getOrDefault(retailerId, false) == Boolean.FALSE) {
                activeByRetailerId.put(retailerId, true);
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

            Retailer retailer = connectedRetailers.get(retailerId);
            BigDecimal creditLimit = retailer != null ? retailer.getCreditLimit() : null;

            // totalOverdue = credit-exceeded OR past-due (conservative: if credit exceeded, treat full outstanding as overdue).
            BigDecimal overdue = BigDecimal.ZERO;
            if (outstanding.compareTo(ZERO) > 0) {
                boolean creditExceeded = creditLimit != null && outstanding.compareTo(creditLimit) > 0;
                overdue = creditExceeded ? outstanding : pastDue;
            }

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

        String s = sort == null ? "revenue" : sort.trim().toLowerCase(Locale.ROOT);
        if ("risk".equals(s)) {
            rows.sort((a, b) -> {
                int cmp = riskScore(b).compareTo(riskScore(a));
                if (cmp != 0) {
                    return cmp;
                }
                return b.getOverdue().compareTo(a.getOverdue());
            });
        } else {
            rows.sort((a, b) -> b.getRevenue().compareTo(a.getRevenue()));
        }
        return rows;
    }

    private static BigDecimal riskScore(TerritoryPerformanceDTO r) {
        if (r.getRevenue() == null || r.getRevenue().compareTo(ZERO) <= 0) {
            return r.getOverdue() == null ? ZERO : r.getOverdue();
        }
        return r.getOverdue().divide(r.getRevenue(), 6, RoundingMode.HALF_UP);
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

