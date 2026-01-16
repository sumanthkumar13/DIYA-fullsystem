package com.diya.backend.service;

import com.diya.backend.dto.dashboard.*;
import com.diya.backend.entity.*;
import com.diya.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

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

        // ------------------------------------------------------
        // KPI SECTION
        // ------------------------------------------------------
        public DashboardKpiDTO getKpiData(String identifier, String authType) {
                Wholesaler wholesaler = getWholesaler(identifier, authType);

                LocalDate today = LocalDate.now();

                int newOrdersToday = (int) orderRepository
                                .findByWholesaler(wholesaler)
                                .stream()
                                .filter(o -> o.getPlacedAt().toLocalDate().isEqual(today))
                                .count();

                double paymentsToday = paymentRepository.findByWholesaler(wholesaler).stream()
                                .filter(p -> p.getStatus() == Payment.PaymentStatus.CONFIRMED)
                                .filter(p -> p.getConfirmedAt() != null
                                                && p.getConfirmedAt().toLocalDate().isEqual(today))
                                .mapToDouble(Payment::getAmount)
                                .sum();

                int pendingOrders = (int) orderRepository
                                .findByWholesaler(wholesaler)
                                .stream()
                                .filter(o -> o.getStatus() == Order.Status.PLACED)
                                .count();

                double credit = ledgerRepository.findByWholesaler(wholesaler).stream()
                                .filter(l -> l.getEntryType() == LedgerEntry.EntryType.CREDIT)
                                .mapToDouble(LedgerEntry::getAmount).sum();

                double debit = ledgerRepository.findByWholesaler(wholesaler).stream()
                                .filter(l -> l.getEntryType() == LedgerEntry.EntryType.DEBIT)
                                .mapToDouble(LedgerEntry::getAmount).sum();

                return DashboardKpiDTO.builder()
                                .newOrdersToday(newOrdersToday)
                                .paymentsReceivedToday(paymentsToday)
                                .pendingOrders(pendingOrders)
                                .totalOutstanding(credit - debit)
                                .build();
        }

        // ------------------------------------------------------
        // TERRITORY SECTION
        // ------------------------------------------------------
        public TerritoryDTO getTerritoryStats(String identifier, String authType) {
                Wholesaler wholesaler = getWholesaler(identifier, authType);

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
