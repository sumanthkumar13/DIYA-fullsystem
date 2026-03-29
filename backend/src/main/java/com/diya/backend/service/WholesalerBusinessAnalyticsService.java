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
        Set<java.util.UUID> connectedRetailerIds = new HashSet<>();
        Map<java.util.UUID, Retailer> connectedRetailers = new HashMap<>();
        for (Connection c : approved) {
            Retailer r = c.getRetailer();
            if (r != null && r.getId() != null) {
                connectedRetailerIds.add(r.getId());
                connectedRetailers.put(r.getId(), r);
            }
        }

        List<Order> allOrders = orderRepository.findByWholesaler(wholesaler);
        List<Payment> allPayments = paymentRepository.findByWholesaler(wholesaler);
        Map<java.util.UUID, BigDecimal> paidByOrderId = new HashMap<>();
        for (Payment p : allPayments) {
            if (p.getOrder() == null || p.getStatus() != Payment.PaymentStatus.CONFIRMED) {
                continue;
            }
            java.util.UUID oid = p.getOrder().getId();
            BigDecimal amt = p.getAmount() == null ? ZERO : p.getAmount();
            paidByOrderId.merge(oid, amt, BigDecimal::add);
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime thirtyDaysAgo = now.minusDays(30);
        EnumSet<Order.Status> excluded = EnumSet.of(Order.Status.CANCELLED, Order.Status.REJECTED);

        List<TerritoryPerformanceDTO> rows = new ArrayList<>();
        for (String regionName : RegionCatalog.CANONICAL_REGIONS) {
            BigDecimal revenue = ZERO;
            BigDecimal outstanding = ZERO;
            BigDecimal overdue = ZERO;
            Set<java.util.UUID> activeInRegion = new HashSet<>();

            int totalRetailers = 0;
            for (java.util.UUID rid : connectedRetailerIds) {
                Retailer ret = connectedRetailers.get(rid);
                if (ret != null && regionName.equals(RegionCatalog.normalize(ret.getRegion()))) {
                    totalRetailers++;
                }
            }

            for (Order o : allOrders) {
                if (excluded.contains(o.getStatus())) {
                    continue;
                }
                Retailer ret = o.getRetailer();
                if (ret == null || !regionName.equals(RegionCatalog.normalize(ret.getRegion()))) {
                    continue;
                }

                BigDecimal total = o.getTotalAmount() == null ? ZERO : o.getTotalAmount();
                revenue = revenue.add(total);

                BigDecimal paid = paidByOrderId.getOrDefault(o.getId(), ZERO);
                BigDecimal out = total.subtract(paid).max(ZERO);
                outstanding = outstanding.add(out);

                LocalDateTime due = effectiveCreditDue(o);
                if (due != null && due.isBefore(now) && out.compareTo(ZERO) > 0) {
                    overdue = overdue.add(out);
                }

                if (o.getPlacedAt() != null
                        && !o.getPlacedAt().isBefore(thirtyDaysAgo)
                        && connectedRetailerIds.contains(ret.getId())) {
                    activeInRegion.add(ret.getId());
                }
            }

            String status = classifyTerritoryStatus(revenue, outstanding, overdue);
            rows.add(TerritoryPerformanceDTO.builder()
                    .region(regionName)
                    .revenue(revenue)
                    .outstanding(outstanding)
                    .overdue(overdue)
                    .activeRetailers(activeInRegion.size())
                    .totalRetailers(totalRetailers)
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

