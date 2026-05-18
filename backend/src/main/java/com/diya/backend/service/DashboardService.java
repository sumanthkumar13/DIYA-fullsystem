package com.diya.backend.service;

import com.diya.backend.dto.dashboard.*;
import com.diya.backend.dto.analytics.TerritoryPerformanceDTO;
import com.diya.backend.entity.*;
import com.diya.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.*;

@Service
@RequiredArgsConstructor
public class DashboardService {

        private final WholesalerRepository wholesalerRepository;
        private final OrderRepository orderRepository;
        private final PaymentRepository paymentRepository;
        private final ConnectionRepository connectionRepository;
        private final WholesalerBusinessAnalyticsService analyticsService;

        /**
         * Distinct non-empty {@link Retailer#getRegion()} among APPROVED connections for this wholesaler.
         */
        public List<String> getActiveRetailerRegions(String identifier, String authType) {
                Wholesaler wholesaler = getWholesaler(identifier, authType);
                Set<String> regions = new TreeSet<>();
                for (Connection c : connectionRepository.findByWholesalerAndStatusOrderByRequestedAtDesc(
                                wholesaler, Connection.Status.APPROVED)) {
                        Retailer r = c.getRetailer();
                        if (r == null) {
                                continue;
                        }
                        String reg = com.diya.backend.util.RegionCatalog.normalize(r.getRegion());
                        if (!reg.isEmpty()) {
                                regions.add(reg);
                        }
                }
                return new ArrayList<>(regions);
        }

        /**
         * @param regionFilter null, blank, or "all" = all connected retailers; otherwise match
         *                     {@link Retailer#getRegion()} (trimmed) for APPROVED connections only.
         */
        public DashboardKpiDTO getKpiData(String identifier, String authType, String regionFilter) {
                Wholesaler wholesaler = getWholesaler(identifier, authType);
                Set<UUID> retailerScope = resolveRetailerScope(wholesaler, regionFilter);

                LocalDate today = LocalDate.now();
                LocalDate yesterday = today.minusDays(1);
                LocalDateTime yesterdayEnd = yesterday.atTime(LocalTime.MAX);

                int newOrdersToday = (int) orderRepository
                                .findByWholesaler(wholesaler)
                                .stream()
                                .filter(o -> retailerScope == null || retailerScope.contains(o.getRetailer().getId()))
                                .filter(o -> o.getPlacedAt().toLocalDate().isEqual(today))
                                .count();

                int newOrdersYesterday = (int) orderRepository
                                .findByWholesaler(wholesaler)
                                .stream()
                                .filter(o -> retailerScope == null || retailerScope.contains(o.getRetailer().getId()))
                                .filter(o -> o.getPlacedAt().toLocalDate().isEqual(yesterday))
                                .count();

                BigDecimal paymentsToday = paymentRepository.findByWholesaler(wholesaler).stream()
                                .filter(p -> retailerScope == null || retailerScope.contains(p.getRetailer().getId()))
                                .filter(p -> p.getStatus() == Payment.PaymentStatus.CONFIRMED)
                                .filter(p -> p.getConfirmedAt() != null
                                                && p.getConfirmedAt().toLocalDate().isEqual(today))
                                .map(Payment::getAmount)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);

                BigDecimal paymentsYesterday = paymentRepository.findByWholesaler(wholesaler).stream()
                                .filter(p -> retailerScope == null || retailerScope.contains(p.getRetailer().getId()))
                                .filter(p -> p.getStatus() == Payment.PaymentStatus.CONFIRMED)
                                .filter(p -> p.getConfirmedAt() != null
                                                && p.getConfirmedAt().toLocalDate().isEqual(yesterday))
                                .map(Payment::getAmount)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);

                int pendingOrders = (int) orderRepository
                                .findByWholesaler(wholesaler)
                                .stream()
                                .filter(o -> retailerScope == null || retailerScope.contains(o.getRetailer().getId()))
                                .filter(o -> o.getStatus() == Order.Status.PLACED)
                                .count();

                int pendingOrdersYesterday = (int) orderRepository
                                .findByWholesaler(wholesaler)
                                .stream()
                                .filter(o -> o != null && o.getRetailer() != null && o.getRetailer().getId() != null)
                                .filter(o -> retailerScope == null || retailerScope.contains(o.getRetailer().getId()))
                                // must exist by yesterday end
                                .filter(o -> o.getPlacedAt() != null && !o.getPlacedAt().isAfter(yesterdayEnd))
                                // consider it pending "as of yesterday end" if it wasn't accepted/cancelled yet
                                .filter(o -> o.getStatus() != Order.Status.REJECTED && o.getStatus() != Order.Status.CANCELLED)
                                .filter(o -> o.getAcceptedAt() == null || o.getAcceptedAt().isAfter(yesterdayEnd))
                                .filter(o -> o.getCancelledAt() == null || o.getCancelledAt().isAfter(yesterdayEnd))
                                .count();

                BigDecimal salesToday = sumSalesForCalendarDay(wholesaler, retailerScope, today);
                BigDecimal salesYesterday = sumSalesForCalendarDay(wholesaler, retailerScope, yesterday);

                return DashboardKpiDTO.builder()
                                .newOrdersToday(newOrdersToday)
                                .newOrdersYesterday(newOrdersYesterday)
                                .paymentsReceivedToday(paymentsToday)
                                .paymentsReceivedYesterday(paymentsYesterday)
                                .pendingOrders(pendingOrders)
                                .pendingOrdersYesterday(pendingOrdersYesterday)
                                .salesToday(salesToday)
                                .salesYesterday(salesYesterday)
                                .build();
        }

        /**
         * Single KPI metric for a time window (independent per-card on the dashboard).
         */
        public KpiWidgetDTO getKpiWidget(
                        String identifier,
                        String authType,
                        String metricRaw,
                        String periodRaw,
                        String regionFilter) {
                Wholesaler wholesaler = getWholesaler(identifier, authType);
                Set<UUID> retailerScope = resolveRetailerScope(wholesaler, regionFilter);
                KpiMetric metric = KpiMetric.parse(metricRaw);
                KpiTimePeriod period = KpiTimePeriod.parse(periodRaw);
                PeriodWindow pw = resolvePeriodWindow(period);

                BigDecimal value = computeKpiValue(wholesaler, retailerScope, metric, pw.start, pw.endExclusive);
                BigDecimal comparison = computeKpiValue(wholesaler, retailerScope, metric, pw.compStart, pw.compEndExclusive);

                return KpiWidgetDTO.builder()
                                .metric(metric.name())
                                .period(period.name())
                                .value(value)
                                .comparisonValue(comparison)
                                .build();
        }

        /**
         * Sales aggregated by retailer for the selected {@link KpiTimePeriod} and region.
         */
        public SalesDetailsPageDTO getSalesDetails(
                        String identifier,
                        String authType,
                        String regionFilter,
                        String periodRaw,
                        int page,
                        int size) {
                Wholesaler wholesaler = getWholesaler(identifier, authType);
                Set<UUID> retailerScope = resolveRetailerScope(wholesaler, regionFilter);
                KpiTimePeriod period = KpiTimePeriod.parse(periodRaw);
                PeriodWindow pw = resolvePeriodWindow(period);

                Map<UUID, BigDecimal> sums = new HashMap<>();
                Map<UUID, Retailer> retailers = new HashMap<>();
                for (Order o : orderRepository.findByWholesaler(wholesaler)) {
                        if (!countsTowardSales(o)) {
                                continue;
                        }
                        LocalDateTime at = o.getAcceptedAt();
                        if (at == null || at.isBefore(pw.start) || !at.isBefore(pw.endExclusive)) {
                                continue;
                        }
                        if (retailerScope != null
                                        && (o.getRetailer() == null || !retailerScope.contains(o.getRetailer().getId()))) {
                                continue;
                        }
                        UUID rid = o.getRetailer().getId();
                        BigDecimal amt = o.getTotalAmount() != null ? o.getTotalAmount() : BigDecimal.ZERO;
                        sums.merge(rid, amt, BigDecimal::add);
                        retailers.putIfAbsent(rid, o.getRetailer());
                }

                List<SalesRetailerRowDTO> allRows = sums.entrySet().stream()
                                .map(e -> SalesRetailerRowDTO.builder()
                                                .retailerId(e.getKey())
                                                .shopName(retailerShopDisplayName(retailers.get(e.getKey())))
                                                .totalSales(e.getValue())
                                                .build())
                                .sorted(Comparator.comparing(
                                                SalesRetailerRowDTO::getTotalSales,
                                                Comparator.nullsLast(Comparator.reverseOrder())))
                                .toList();

                int p = Math.max(0, page);
                int s = Math.min(100, Math.max(1, size));
                long total = allRows.size();
                int from = (int) Math.min(total, (long) p * s);
                int to = (int) Math.min(total, from + (long) s);
                List<SalesRetailerRowDTO> slice = from >= to ? List.of() : new ArrayList<>(allRows.subList(from, to));
                int totalPages = total == 0 ? 1 : (int) Math.ceil(total / (double) s);

                BigDecimal windowTotal = sumSalesInWindow(wholesaler, retailerScope, pw.start, pw.endExclusive);
                LocalDate rangeStartDate = pw.start.toLocalDate();

                return SalesDetailsPageDTO.builder()
                                .dayTotalSales(windowTotal)
                                .period(period.name())
                                .rangeLabel(formatSalesRangeLabel(pw.start, pw.endExclusive))
                                .day(new SalesDetailsPageDTO.SalesDayDTO(
                                                rangeStartDate.getYear(),
                                                rangeStartDate.getMonthValue(),
                                                rangeStartDate.getDayOfMonth()))
                                .content(slice)
                                .page(p)
                                .size(s)
                                .totalElements(total)
                                .totalPages(totalPages)
                                .build();
        }

        private static final class PeriodWindow {
                final LocalDateTime start;
                final LocalDateTime endExclusive;
                final LocalDateTime compStart;
                final LocalDateTime compEndExclusive;

                private PeriodWindow(
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

        private static String formatSalesRangeLabel(LocalDateTime startInclusive, LocalDateTime endExclusive) {
                LocalDate a = startInclusive.toLocalDate();
                LocalDate b = endExclusive.toLocalDate().minusDays(1);
                DateTimeFormatter fmt = DateTimeFormatter.ofPattern("d MMM yyyy", Locale.forLanguageTag("en-IN"));
                if (a.equals(b)) {
                        return a.format(fmt);
                }
                return a.format(fmt) + " – " + b.format(fmt);
        }

        private BigDecimal computeKpiValue(
                        Wholesaler wholesaler,
                        Set<UUID> retailerScope,
                        KpiMetric metric,
                        LocalDateTime start,
                        LocalDateTime endExclusive) {
                if (retailerScope != null && retailerScope.isEmpty()) {
                        return BigDecimal.ZERO;
                }
                return switch (metric) {
                        case NEW_ORDERS -> BigDecimal.valueOf(
                                        countOrdersPlacedInWindow(wholesaler, retailerScope, start, endExclusive));
                        case PAYMENTS -> sumPaymentsInWindow(wholesaler, retailerScope, start, endExclusive);
                        case PENDING_ORDERS -> BigDecimal.valueOf(
                                        countPendingPlacedInWindow(wholesaler, retailerScope, start, endExclusive));
                        case SALES -> sumSalesInWindow(wholesaler, retailerScope, start, endExclusive);
                };
        }

        private long countOrdersPlacedInWindow(
                        Wholesaler wholesaler,
                        Set<UUID> retailerScope,
                        LocalDateTime startInclusive,
                        LocalDateTime endExclusive) {
                return orderRepository.findByWholesaler(wholesaler).stream()
                                .filter(o -> o != null && o.getPlacedAt() != null)
                                .filter(o -> retailerScope == null
                                                || (o.getRetailer() != null
                                                                && retailerScope.contains(o.getRetailer().getId())))
                                .filter(o -> !o.getPlacedAt().isBefore(startInclusive)
                                                && o.getPlacedAt().isBefore(endExclusive))
                                .count();
        }

        private long countPendingPlacedInWindow(
                        Wholesaler wholesaler,
                        Set<UUID> retailerScope,
                        LocalDateTime startInclusive,
                        LocalDateTime endExclusive) {
                return orderRepository.findByWholesaler(wholesaler).stream()
                                .filter(o -> o != null && o.getPlacedAt() != null && o.getStatus() == Order.Status.PLACED)
                                .filter(o -> retailerScope == null
                                                || (o.getRetailer() != null
                                                                && retailerScope.contains(o.getRetailer().getId())))
                                .filter(o -> !o.getPlacedAt().isBefore(startInclusive)
                                                && o.getPlacedAt().isBefore(endExclusive))
                                .count();
        }

        private BigDecimal sumPaymentsInWindow(
                        Wholesaler wholesaler,
                        Set<UUID> retailerScope,
                        LocalDateTime startInclusive,
                        LocalDateTime endExclusive) {
                BigDecimal sum = BigDecimal.ZERO;
                for (Payment p : paymentRepository.findByWholesaler(wholesaler)) {
                        if (p == null || p.getStatus() != Payment.PaymentStatus.CONFIRMED) {
                                continue;
                        }
                        LocalDateTime at = p.getConfirmedAt();
                        if (at == null) {
                                continue;
                        }
                        if (at.isBefore(startInclusive) || !at.isBefore(endExclusive)) {
                                continue;
                        }
                        if (retailerScope != null
                                        && (p.getRetailer() == null || !retailerScope.contains(p.getRetailer().getId()))) {
                                continue;
                        }
                        sum = sum.add(p.getAmount() != null ? p.getAmount() : BigDecimal.ZERO);
                }
                return sum;
        }

        private static final EnumSet<Order.Status> SALES_ELIGIBLE_STATUSES = EnumSet.of(
                        Order.Status.ACCEPTED,
                        Order.Status.PACKING,
                        Order.Status.DISPATCHED,
                        Order.Status.DELIVERED,
                        Order.Status.COMPLETED,
                        Order.Status.INVOICED);

        private static LocalDate saleAttributionDate(Order o) {
                if (o == null || o.getAcceptedAt() == null) {
                        return null;
                }
                return o.getAcceptedAt().toLocalDate();
        }

        private static boolean countsTowardSales(Order o) {
                return o != null
                                && o.getStatus() != null
                                && SALES_ELIGIBLE_STATUSES.contains(o.getStatus())
                                && saleAttributionDate(o) != null;
        }

        private BigDecimal sumSalesForCalendarDay(Wholesaler wholesaler, Set<UUID> retailerScope, LocalDate day) {
                return sumSalesInWindow(
                                wholesaler,
                                retailerScope,
                                day.atStartOfDay(),
                                day.plusDays(1).atStartOfDay());
        }

        private BigDecimal sumSalesInWindow(
                        Wholesaler wholesaler,
                        Set<UUID> retailerScope,
                        LocalDateTime startInclusive,
                        LocalDateTime endExclusive) {
                BigDecimal sum = BigDecimal.ZERO;
                for (Order o : orderRepository.findByWholesaler(wholesaler)) {
                        if (!countsTowardSales(o)) {
                                continue;
                        }
                        LocalDateTime at = o.getAcceptedAt();
                        if (at == null || at.isBefore(startInclusive) || !at.isBefore(endExclusive)) {
                                continue;
                        }
                        if (retailerScope != null
                                        && (o.getRetailer() == null || !retailerScope.contains(o.getRetailer().getId()))) {
                                continue;
                        }
                        BigDecimal total = o.getTotalAmount() != null ? o.getTotalAmount() : BigDecimal.ZERO;
                        sum = sum.add(total);
                }
                return sum;
        }

        private String retailerShopDisplayName(Retailer r) {
                if (r == null) {
                        return "Retailer";
                }
                String shop = r.getShopName() != null ? r.getShopName().trim() : "";
                if (!shop.isEmpty()) {
                        return shop;
                }
                String contact = r.getContactName() != null ? r.getContactName().trim() : "";
                if (!contact.isEmpty()) {
                        return contact;
                }
                if (r.getUser() != null && r.getUser().getName() != null && !r.getUser().getName().isBlank()) {
                        return r.getUser().getName().trim();
                }
                return "Retailer";
        }

        /** null = no filter; empty set = no retailers match region */
        private Set<UUID> resolveRetailerScope(Wholesaler wholesaler, String regionFilter) {
                if (regionFilter == null || regionFilter.isBlank()
                                || "all".equalsIgnoreCase(regionFilter.trim())) {
                        return null;
                }
                String want = com.diya.backend.util.RegionCatalog.normalize(regionFilter.trim());
                Set<UUID> ids = new HashSet<>();
                for (Connection c : connectionRepository.findByWholesalerAndStatusOrderByRequestedAtDesc(
                                wholesaler, Connection.Status.APPROVED)) {
                        Retailer r = c.getRetailer();
                        if (r == null) {
                                continue;
                        }
                        if (want.equals(com.diya.backend.util.RegionCatalog.normalize(r.getRegion()))) {
                                ids.add(r.getId());
                        }
                }
                return ids;
        }

        // ------------------------------------------------------
        // TERRITORY SECTION
        // ------------------------------------------------------
        public TerritoryDTO getTerritoryStats(String identifier, String authType) {
                Wholesaler wholesaler = getWholesaler(identifier, authType);

                // Totals are based on the wholesaler's APPROVED connections.
                List<Connection> approved = connectionRepository
                                .findByWholesalerAndStatusOrderByRequestedAtDesc(
                                                wholesaler, Connection.Status.APPROVED);

                int total = 0;
                int active = 0;
                for (Connection conn : approved) {
                        Retailer r = conn.getRetailer();
                        if (r == null) continue;
                        total++;
                        if (r.isActive()) active++;
                }

                // Top / risk region derived from real territory-performance aggregation (retailer.region only).
                List<TerritoryPerformanceDTO> perf = analyticsService.getTerritoryPerformance(identifier);

                TerritoryPerformanceDTO topRow = perf.stream()
                                .max(Comparator.comparing(p -> p.getRevenue() == null ? BigDecimal.ZERO : p.getRevenue()))
                                .orElse(null);
                TerritoryPerformanceDTO riskyRow = perf.stream()
                                .filter(p -> "RISK".equals(p.getStatus()))
                                .max(Comparator.comparing(p -> p.getOverdue() == null ? BigDecimal.ZERO : p.getOverdue()))
                                .orElseGet(() -> perf.stream()
                                                .max(Comparator.comparing(p -> p.getOverdue() == null ? BigDecimal.ZERO : p.getOverdue()))
                                                .orElse(null));

                double topValue = topRow != null && topRow.getRevenue() != null
                                ? topRow.getRevenue().doubleValue()
                                : 0d;
                double riskValue = riskyRow != null && riskyRow.getOverdue() != null
                                ? riskyRow.getOverdue().doubleValue()
                                : 0d;

                AreaDTO topArea = topRow != null
                                ? new AreaDTO(topRow.getRegion(), topValue)
                                : new AreaDTO("", 0d);
                AreaDTO riskyArea = riskyRow != null
                                ? new AreaDTO(riskyRow.getRegion(), riskValue)
                                : new AreaDTO("", 0d);

                return TerritoryDTO.builder()
                                .activeRetailers(active)
                                .totalRetailers(total)
                                .topArea(topArea)
                                .highestRiskArea(riskyArea)
                                .build();
        }

        // ------------------------------------------------------
        // ACTIVITY FEED
        // ------------------------------------------------------
        public List<ActivityItemDTO> getActivityFeed(String identifier, String authType) {
                Wholesaler wholesaler = getWholesaler(identifier, authType);

                LocalDate today = LocalDate.now();

                class Event {
                        LocalDateTime at;
                        ActivityItemDTO dto;
                        Event(LocalDateTime at, ActivityItemDTO dto) { this.at = at; this.dto = dto; }
                }

                List<Event> events = new ArrayList<>();

                orderRepository.findByWholesaler(wholesaler).forEach(o -> {
                        if (o == null || o.getPlacedAt() == null) return;
                        if (!o.getPlacedAt().toLocalDate().isEqual(today)) return;
                        String retailerName = (o.getRetailer() != null && o.getRetailer().getUser() != null
                                && o.getRetailer().getUser().getName() != null)
                                ? o.getRetailer().getUser().getName()
                                : "Retailer";
                        events.add(new Event(
                                o.getPlacedAt(),
                                ActivityItemDTO.builder()
                                        .type("ORDER")
                                        .title("New Order " + o.getOrderNumber())
                                        .subtitle(retailerName + " • ₹" + o.getTotalAmount())
                                        .timeAgo(timeAgo(o.getPlacedAt()))
                                        .build()
                        ));
                });

                paymentRepository.findByWholesaler(wholesaler).forEach(p -> {
                        if (p == null) return;
                        LocalDateTime at = p.getConfirmedAt() != null ? p.getConfirmedAt() : p.getCreatedAt();
                        if (at == null) return;
                        if (!at.toLocalDate().isEqual(today)) return;
                        String retailerName = (p.getRetailer() != null && p.getRetailer().getUser() != null
                                && p.getRetailer().getUser().getName() != null)
                                ? p.getRetailer().getUser().getName()
                                : "Retailer";
                        events.add(new Event(
                                at,
                                ActivityItemDTO.builder()
                                        .type("PAYMENT")
                                        .title("Payment Received")
                                        .subtitle(retailerName + " • ₹" + p.getAmount())
                                        .timeAgo(timeAgo(at))
                                        .build()
                        ));
                });

                events.sort((a, b) -> {
                        if (a.at == null && b.at == null) return 0;
                        if (a.at == null) return 1;
                        if (b.at == null) return -1;
                        return b.at.compareTo(a.at); // newest first
                });

                List<ActivityItemDTO> list = new ArrayList<>();
                for (Event e : events) {
                        if (e.dto != null) list.add(e.dto);
                }
                return list;
        }

        private Wholesaler getWholesaler(String identifier, String authType) {
                if (authType.equals("EMAIL")) {
                        return wholesalerRepository.findByUserEmail(identifier)
                                        .orElseThrow(() -> new RuntimeException("Wholesaler not found"));
                } else {
                        return wholesalerRepository.findByUserPhone(identifier)
                                        .orElseThrow(() -> new RuntimeException("Wholesaler not found"));
                }
        }

        private String timeAgo(LocalDateTime time) {
                long minutes = java.time.Duration.between(time, LocalDateTime.now()).toMinutes();
                if (minutes < 60)
                        return minutes + "m ago";
                long hours = minutes / 60;
                if (hours < 24)
                        return hours + "h ago";
                return (minutes / 1440) + "d ago";
        }
}
