package com.diya.backend.service;

import com.diya.backend.entity.*;
import com.diya.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
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

                double totalSales = orders.stream().mapToDouble(Order::getTotalAmount).sum();
                double totalReceived = payments.stream()
                                .filter(p -> p.getStatus() == Payment.PaymentStatus.CONFIRMED)
                                .mapToDouble(Payment::getAmount)
                                .sum();
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
                summary.put("outstandingAmount", totalSales - totalReceived);
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

                double totalSpent = orders.stream().mapToDouble(Order::getTotalAmount).sum();
                double totalPaid = payments.stream()
                                .filter(p -> p.getStatus() == Payment.PaymentStatus.CONFIRMED)
                                .mapToDouble(Payment::getAmount)
                                .sum();

                Map<String, Object> summary = new LinkedHashMap<>();
                summary.put("retailerName", retailer.getShopName());
                summary.put("totalOrders", orders.size());
                summary.put("totalSpent", totalSpent);
                summary.put("totalPaid", totalPaid);
                summary.put("outstandingDue", totalSpent - totalPaid);
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

                Map<String, Double> monthlyTotals = orders.stream()
                                .collect(Collectors.groupingBy(
                                                o -> o.getPlacedAt()
                                                                .atZone(ZoneId.systemDefault())
                                                                .getMonth()
                                                                .getDisplayName(TextStyle.SHORT, Locale.ENGLISH),
                                                Collectors.summingDouble(Order::getTotalAmount)));

                Map<String, Object> result = new LinkedHashMap<>();
                result.put("wholesaler", wholesaler.getBusinessName());
                result.put("monthlySales", monthlyTotals);
                return result;
        }
}
