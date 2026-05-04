package com.diya.backend.service;

import com.diya.backend.dto.dashboard.*;
import com.diya.backend.dto.analytics.TerritoryPerformanceDTO;
import com.diya.backend.entity.*;
import com.diya.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
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

                // Outstanding = sum(totalAmount - confirmedPaid) for accepted orders only.
                // Excludes pending (PLACED) and rejected/cancelled orders.
                Map<UUID, BigDecimal> paidByOrderId = new HashMap<>();
                for (Payment p : paymentRepository.findByWholesaler(wholesaler)) {
                        if (p == null || p.getOrder() == null || p.getStatus() != Payment.PaymentStatus.CONFIRMED) {
                                continue;
                        }
                        if (retailerScope != null
                                        && (p.getRetailer() == null || !retailerScope.contains(p.getRetailer().getId()))) {
                                continue;
                        }
                        UUID oid = p.getOrder().getId();
                        BigDecimal amt = p.getAmount() != null ? p.getAmount() : BigDecimal.ZERO;
                        paidByOrderId.merge(oid, amt, BigDecimal::add);
                }

                BigDecimal totalOutstanding = BigDecimal.ZERO;
                for (Order o : orderRepository.findByWholesaler(wholesaler)) {
                        if (o == null || o.getRetailer() == null || o.getRetailer().getId() == null) continue;
                        if (retailerScope != null && !retailerScope.contains(o.getRetailer().getId())) continue;
                        Order.Status st = o.getStatus();
                        if (st == Order.Status.PLACED || st == Order.Status.REJECTED || st == Order.Status.CANCELLED) {
                                continue;
                        }
                        BigDecimal total = o.getTotalAmount() != null ? o.getTotalAmount() : BigDecimal.ZERO;
                        BigDecimal paid = paidByOrderId.getOrDefault(o.getId(), BigDecimal.ZERO);
                        BigDecimal out = total.subtract(paid).max(BigDecimal.ZERO);
                        totalOutstanding = totalOutstanding.add(out);
                }

                // Outstanding "as of yesterday end" = accepted on/before yesterday end minus confirmed payments on/before yesterday end.
                Map<UUID, BigDecimal> paidByOrderIdYesterday = new HashMap<>();
                for (Payment p : paymentRepository.findByWholesaler(wholesaler)) {
                        if (p == null || p.getOrder() == null || p.getStatus() != Payment.PaymentStatus.CONFIRMED) {
                                continue;
                        }
                        if (p.getConfirmedAt() == null || p.getConfirmedAt().isAfter(yesterdayEnd)) {
                                continue;
                        }
                        if (retailerScope != null
                                        && (p.getRetailer() == null || !retailerScope.contains(p.getRetailer().getId()))) {
                                continue;
                        }
                        UUID oid = p.getOrder().getId();
                        BigDecimal amt = p.getAmount() != null ? p.getAmount() : BigDecimal.ZERO;
                        paidByOrderIdYesterday.merge(oid, amt, BigDecimal::add);
                }

                BigDecimal totalOutstandingYesterday = BigDecimal.ZERO;
                for (Order o : orderRepository.findByWholesaler(wholesaler)) {
                        if (o == null || o.getRetailer() == null || o.getRetailer().getId() == null) continue;
                        if (retailerScope != null && !retailerScope.contains(o.getRetailer().getId())) continue;
                        if (o.getAcceptedAt() == null || o.getAcceptedAt().isAfter(yesterdayEnd)) {
                                continue; // not yet accepted by yesterday
                        }
                        if (o.getCancelledAt() != null && !o.getCancelledAt().isAfter(yesterdayEnd)) {
                                continue; // cancelled by yesterday
                        }
                        Order.Status st = o.getStatus();
                        if (st == Order.Status.REJECTED || st == Order.Status.CANCELLED || st == Order.Status.PLACED) {
                                continue;
                        }
                        BigDecimal total = o.getTotalAmount() != null ? o.getTotalAmount() : BigDecimal.ZERO;
                        BigDecimal paid = paidByOrderIdYesterday.getOrDefault(o.getId(), BigDecimal.ZERO);
                        BigDecimal out = total.subtract(paid).max(BigDecimal.ZERO);
                        totalOutstandingYesterday = totalOutstandingYesterday.add(out);
                }

                return DashboardKpiDTO.builder()
                                .newOrdersToday(newOrdersToday)
                                .newOrdersYesterday(newOrdersYesterday)
                                .paymentsReceivedToday(paymentsToday)
                                .paymentsReceivedYesterday(paymentsYesterday)
                                .pendingOrders(pendingOrders)
                                .pendingOrdersYesterday(pendingOrdersYesterday)
                                .totalOutstanding(totalOutstanding)
                                .totalOutstandingYesterday(totalOutstandingYesterday)
                                .build();
        }

        /** null = no filter; empty set = no retailers match region */
        private Set<UUID> resolveRetailerScope(Wholesaler wholesaler, String regionFilter) {
                if (regionFilter == null || regionFilter.isBlank()
                                || "all".equalsIgnoreCase(regionFilter.trim())) {
                        return null;
                }
                String want = regionFilter.trim();
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
                List<TerritoryPerformanceDTO> perf = analyticsService.getTerritoryPerformance(identifier, "revenue");

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
