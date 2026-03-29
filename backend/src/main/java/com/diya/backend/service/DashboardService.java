package com.diya.backend.service;

import com.diya.backend.dto.dashboard.*;
import com.diya.backend.entity.*;
import com.diya.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class DashboardService {

        private final WholesalerRepository wholesalerRepository;
        private final OrderRepository orderRepository;
        private final PaymentRepository paymentRepository;
        private final RetailerRepository retailerRepository;
        private final LedgerEntryRepository ledgerRepository;
        private final ConnectionRepository connectionRepository;

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

                int newOrdersToday = (int) orderRepository
                                .findByWholesaler(wholesaler)
                                .stream()
                                .filter(o -> retailerScope == null || retailerScope.contains(o.getRetailer().getId()))
                                .filter(o -> o.getPlacedAt().toLocalDate().isEqual(today))
                                .count();

                BigDecimal paymentsToday = paymentRepository.findByWholesaler(wholesaler).stream()
                                .filter(p -> retailerScope == null || retailerScope.contains(p.getRetailer().getId()))
                                .filter(p -> p.getStatus() == Payment.PaymentStatus.CONFIRMED)
                                .filter(p -> p.getConfirmedAt() != null
                                                && p.getConfirmedAt().toLocalDate().isEqual(today))
                                .map(Payment::getAmount)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);

                int pendingOrders = (int) orderRepository
                                .findByWholesaler(wholesaler)
                                .stream()
                                .filter(o -> retailerScope == null || retailerScope.contains(o.getRetailer().getId()))
                                .filter(o -> o.getStatus() == Order.Status.PLACED)
                                .count();

                BigDecimal credit = ledgerRepository.findByWholesaler(wholesaler).stream()
                                .filter(l -> retailerScope == null || retailerScope.contains(l.getRetailer().getId()))
                                .filter(l -> l.getEntryType() == LedgerEntry.EntryType.CREDIT)
                                .map(LedgerEntry::getAmount)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);

                BigDecimal debit = ledgerRepository.findByWholesaler(wholesaler).stream()
                                .filter(l -> retailerScope == null || retailerScope.contains(l.getRetailer().getId()))
                                .filter(l -> l.getEntryType() == LedgerEntry.EntryType.DEBIT)
                                .map(LedgerEntry::getAmount)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);

                return DashboardKpiDTO.builder()
                                .newOrdersToday(newOrdersToday)
                                .paymentsReceivedToday(paymentsToday)
                                .pendingOrders(pendingOrders)
                                .totalOutstanding(debit.subtract(credit))
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
                getWholesaler(identifier, authType);

                List<Retailer> retailers = retailerRepository.findAll();

                int total = retailers.size();
                int active = (int) retailers.stream().filter(Retailer::isActive).count();

                AreaDTO topArea = new AreaDTO("Banjara Hills", 420000);
                AreaDTO riskyArea = new AreaDTO("Old City", 210000);

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

                List<ActivityItemDTO> list = new ArrayList<>();

                orderRepository.findByWholesaler(wholesaler).forEach(o -> {
                        list.add(ActivityItemDTO.builder()
                                        .type("ORDER")
                                        .title("New Order " + o.getOrderNumber())
                                        .subtitle(o.getRetailer().getUser().getName() + " • ₹" + o.getTotalAmount())
                                        .timeAgo(timeAgo(o.getPlacedAt()))
                                        .build());
                });

                paymentRepository.findByWholesaler(wholesaler).forEach(p -> {
                        list.add(ActivityItemDTO.builder()
                                        .type("PAYMENT")
                                        .title("Payment Received")
                                        .subtitle(p.getRetailer().getUser().getName() + " • ₹" + p.getAmount())
                                        .timeAgo(timeAgo(p.getCreatedAt()))
                                        .build());
                });

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
