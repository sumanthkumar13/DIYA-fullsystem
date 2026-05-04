package com.diya.backend.service;

import com.diya.backend.entity.*;
import com.diya.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.ZoneId;
import java.time.format.TextStyle;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

        private final WholesalerRepository wholesalerRepository;
        private final RetailerRepository retailerRepository;
        private final OrderRepository orderRepository;
        private final PaymentRepository paymentRepository;

        // ✅ Wholesaler dashboard summary
        public Map<String, Object> getWholesalerSummary(String identifier) {
                Wholesaler wholesaler;
                if (identifier.contains("@")) {
                        wholesaler = wholesalerRepository.findByUserEmail(identifier)
                                        .orElseThrow(() -> new RuntimeException("Wholesaler not found"));
                } else {
                        wholesaler = wholesalerRepository.findByUserPhone(identifier)
                                        .orElseThrow(() -> new RuntimeException("Wholesaler not found"));
                }

                List<Order> orders = orderRepository.findAll().stream()
                                .filter(o -> o.getWholesaler().getId().equals(wholesaler.getId()))
                                .toList();

                List<Payment> payments = paymentRepository.findAll().stream()
                                .filter(p -> p.getWholesaler().getId().equals(wholesaler.getId()))
                                .toList();

                BigDecimal totalSales = orders.stream()
                                .map(Order::getTotalAmount)
                                .filter(Objects::nonNull)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);
                BigDecimal totalReceived = payments.stream()
                                .filter(p -> p.getStatus() == Payment.PaymentStatus.CONFIRMED)
                                .map(Payment::getAmount)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);
                long pendingOrders = orders.stream()
                                .filter(o -> o.getStatus() == Order.Status.PLACED)
                                .count();
                long deliveredOrders = orders.stream()
                                .filter(o -> o.getStatus() == Order.Status.DELIVERED)
                                .count();

                Map<String, Object> summary = new LinkedHashMap<>();
                summary.put("wholesalerName", wholesaler.getBusinessName());
                summary.put("totalOrders", orders.size());
                summary.put("totalSales", totalSales);
                summary.put("totalReceived", totalReceived);
                BigDecimal outstanding = totalSales.subtract(totalReceived);
                summary.put("outstandingAmount", (outstanding == null ? BigDecimal.ZERO : outstanding.max(BigDecimal.ZERO)));
                summary.put("pendingOrders", pendingOrders);
                summary.put("deliveredOrders", deliveredOrders);
                summary.put("activeRetailers", retailerRepository.count());
                return summary;
        }

        // ✅ Retailer dashboard summary
        public Map<String, Object> getRetailerSummary(String identifier) {
                Retailer retailer;
                if (identifier.contains("@")) {
                        retailer = retailerRepository.findByUserEmail(identifier)
                                        .orElseThrow(() -> new RuntimeException("Retailer not found"));
                } else {
                        retailer = retailerRepository.findByUserPhone(identifier)
                                        .orElseThrow(() -> new RuntimeException("Retailer not found"));
                }

                List<Order> orders = orderRepository.findAll().stream()
                                .filter(o -> o.getRetailer().getId().equals(retailer.getId()))
                                .toList();

                List<Payment> payments = paymentRepository.findAll().stream()
                                .filter(p -> p.getRetailer().getId().equals(retailer.getId()))
                                .toList();

                BigDecimal totalSpent = orders.stream()
                                .map(Order::getTotalAmount)
                                .filter(Objects::nonNull)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);
                BigDecimal totalPaid = payments.stream()
                                .filter(p -> p.getStatus() == Payment.PaymentStatus.CONFIRMED)
                                .map(Payment::getAmount)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);

                Map<String, Object> summary = new LinkedHashMap<>();
                summary.put("retailerName", retailer.getShopName());
                summary.put("totalOrders", orders.size());
                summary.put("totalSpent", totalSpent);
                summary.put("totalPaid", totalPaid);
                BigDecimal outstanding = totalSpent.subtract(totalPaid);
                summary.put("outstandingDue", (outstanding == null ? BigDecimal.ZERO : outstanding.max(BigDecimal.ZERO)));
                return summary;
        }

        // ✅ Monthly sales for charting (Wholesaler)
        public Map<String, Object> getMonthlySales(String identifier) {
                Wholesaler wholesaler;
                if (identifier.contains("@")) {
                        wholesaler = wholesalerRepository.findByUserEmail(identifier)
                                        .orElseThrow(() -> new RuntimeException("Wholesaler not found"));
                } else {
                        wholesaler = wholesalerRepository.findByUserPhone(identifier)
                                        .orElseThrow(() -> new RuntimeException("Wholesaler not found"));
                }

                List<Order> orders = orderRepository.findAll().stream()
                                .filter(o -> o.getWholesaler().getId().equals(wholesaler.getId()))
                                .toList();

                Map<String, BigDecimal> monthlyTotals = orders.stream()
                                .collect(Collectors.groupingBy(
                                                o -> o.getPlacedAt()
                                                                .atZone(ZoneId.systemDefault())
                                                                .getMonth()
                                                                .getDisplayName(TextStyle.SHORT, Locale.ENGLISH),
                                                Collectors.reducing(BigDecimal.ZERO,
                                                        o -> o.getTotalAmount() != null ? o.getTotalAmount() : BigDecimal.ZERO,
                                                        BigDecimal::add)));

                Map<String, Object> result = new LinkedHashMap<>();
                result.put("wholesaler", wholesaler.getBusinessName());
                result.put("monthlySales", monthlyTotals);
                return result;
        }
}
