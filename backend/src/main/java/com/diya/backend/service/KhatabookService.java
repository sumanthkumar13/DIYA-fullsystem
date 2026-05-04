package com.diya.backend.service;

import com.diya.backend.dto.khatabook.KhatabookSummaryDTO;
import com.diya.backend.dto.khatabook.RecordPaymentRequest;
import com.diya.backend.dto.khatabook.RetailerDueDTO;
import com.diya.backend.dto.khatabook.RetailerLedgerLineDTO;
import com.diya.backend.dto.khatabook.RetailerStatementResponseDTO;
import com.diya.backend.dto.retailer.RetailerCreditOverviewDTO;
import com.diya.backend.dto.retailer.RetailerCreditSummaryDTO;
import com.diya.backend.entity.Connection;
import com.diya.backend.entity.LedgerEntry;
import com.diya.backend.entity.Order;
import com.diya.backend.entity.Payment;
import com.diya.backend.entity.Retailer;
import com.diya.backend.entity.Wholesaler;
import com.diya.backend.repository.ConnectionRepository;
import com.diya.backend.repository.LedgerEntryRepository;
import com.diya.backend.repository.OrderRepository;
import com.diya.backend.repository.PaymentRepository;
import com.diya.backend.repository.RetailerRepository;
import com.diya.backend.repository.WholesalerRepository;
import com.diya.backend.util.LedgerAccounting;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class KhatabookService {

    private final ConnectionRepository connectionRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;
    private final RetailerRepository retailerRepository;
    private final WholesalerRepository wholesalerRepository;

    private static final BigDecimal PAYMENT_TOLERANCE = new BigDecimal("0.01");

    /**
     * Dashboard summary for Khatabook page: total outstanding, critical overdue,
     * collected this month, and count of retailers with outstanding > 0.
     */
    @Transactional(readOnly = true)
    public KhatabookSummaryDTO getKhatabookSummary(UUID wholesalerId) {
        Wholesaler wholesaler = wholesalerRepository.findById(wholesalerId)
                .orElseThrow(() -> new RuntimeException("Wholesaler not found: " + wholesalerId));

        List<LedgerEntry> allEntries = ledgerEntryRepository.findByWholesaler(wholesaler);
        LocalDate today = LocalDate.now();
        LocalDateTime yesterdayEnd = today.minusDays(1).atTime(LocalTime.MAX);

        // 1) Compute per-retailer balances (DEBIT - CREDIT).
        //    For summary totals, we exclude negative balances (advance/excess credits)
        //    to avoid incorrect "negative outstanding" and mismatch vs retailer list.
        Map<UUID, BigDecimal> perRetailer = allEntries.stream()
                .filter(e -> e != null && e.getRetailer() != null && e.getRetailer().getId() != null)
                .collect(Collectors.groupingBy(
                        e -> e.getRetailer().getId(),
                        Collectors.reducing(BigDecimal.ZERO,
                                LedgerAccounting::signedEffect,
                                BigDecimal::add)));

        BigDecimal totalOutstanding = perRetailer.values().stream()
                .filter(Objects::nonNull)
                .map(b -> b.max(BigDecimal.ZERO))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<UUID, BigDecimal> perRetailerYesterday = allEntries.stream()
                .filter(e -> e != null && e.getRetailer() != null && e.getRetailer().getId() != null)
                .filter(e -> e.getEntryDate() != null && !e.getEntryDate().isAfter(yesterdayEnd))
                .collect(Collectors.groupingBy(
                        e -> e.getRetailer().getId(),
                        Collectors.reducing(BigDecimal.ZERO,
                                LedgerAccounting::signedEffect,
                                BigDecimal::add)));

        BigDecimal totalOutstandingYesterday = perRetailerYesterday.values().stream()
                .filter(Objects::nonNull)
                .map(b -> b.max(BigDecimal.ZERO))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 2) criticalOverdue: DEBIT entries older than 7 days, sum of amounts
        LocalDateTime sevenDaysAgo = LocalDateTime.now().minusDays(7);
        BigDecimal criticalOverdue = allEntries.stream()
                .filter(e -> e.getEntryType() == LedgerEntry.EntryType.DEBIT && e.getEntryDate() != null && e.getEntryDate().isBefore(sevenDaysAgo))
                .map(LedgerEntry::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (criticalOverdue == null) criticalOverdue = BigDecimal.ZERO;

        // 3) collectedThisMonth: CONFIRMED payments, confirmedAt in current month
        List<Payment> confirmedPayments = paymentRepository.findByWholesalerAndStatus(wholesaler, Payment.PaymentStatus.CONFIRMED);
        YearMonth currentMonth = YearMonth.now();
        BigDecimal collectedThisMonth = confirmedPayments.stream()
                .filter(p -> p.getConfirmedAt() != null && YearMonth.from(p.getConfirmedAt()).equals(currentMonth))
                .map(Payment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (collectedThisMonth == null) collectedThisMonth = BigDecimal.ZERO;

        BigDecimal collectedThisMonthYesterday = confirmedPayments.stream()
                .filter(p -> p.getConfirmedAt() != null
                        && !p.getConfirmedAt().isAfter(yesterdayEnd)
                        && YearMonth.from(p.getConfirmedAt()).equals(currentMonth))
                .map(Payment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (collectedThisMonthYesterday == null) collectedThisMonthYesterday = BigDecimal.ZERO;

        // 4) retailerCount: unique retailers with outstanding > 0
        long retailerCount = perRetailer.values().stream()
                .filter(bal -> bal != null && bal.compareTo(BigDecimal.ZERO) > 0)
                .count();

        return new KhatabookSummaryDTO(
                totalOutstanding,
                totalOutstandingYesterday,
                criticalOverdue,
                collectedThisMonth,
                collectedThisMonthYesterday,
                retailerCount
        );
    }

    /**
     * Retailer-wise dues for Khatabook list: total due, overdue amount,
     * last payment/order dates, overdue days. Includes all connected retailers;
     * those without dues will have totalDue = 0.
     */
    @Transactional(readOnly = true)
    public List<RetailerDueDTO> getRetailerDues(UUID wholesalerId) {
        Wholesaler wholesaler = wholesalerRepository.findById(wholesalerId)
                .orElseThrow(() -> new RuntimeException("Wholesaler not found: " + wholesalerId));

        List<LedgerEntry> allEntries = ledgerEntryRepository.findByWholesaler(wholesaler);
        LocalDateTime sevenDaysAgo = LocalDateTime.now().minusDays(7);

        Map<UUID, List<LedgerEntry>> byRetailer = allEntries.stream()
                .collect(Collectors.groupingBy(e -> e.getRetailer().getId()));

        Set<UUID> managedRetailerIds = connectionRepository
                .findByWholesalerAndStatusInOrderByRequestedAtDesc(
                        wholesaler,
                        List.of(Connection.Status.APPROVED, Connection.Status.BLOCKED))
                .stream()
                .map(c -> c.getRetailer() != null ? c.getRetailer().getId() : null)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(HashSet::new));

        List<RetailerDueDTO> result = new ArrayList<>();

        for (Map.Entry<UUID, List<LedgerEntry>> entry : byRetailer.entrySet()) {
            UUID retailerId = entry.getKey();
            if (!managedRetailerIds.contains(retailerId)) {
                continue;
            }
            List<LedgerEntry> entries = entry.getValue();

            BigDecimal totalDue = entries.stream()
                    .map(LedgerAccounting::signedEffect)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            if (totalDue == null) {
                totalDue = BigDecimal.ZERO;
            }
            totalDue = totalDue.max(BigDecimal.ZERO);

            BigDecimal overdueAmount = entries.stream()
                    .filter(e -> e.getEntryType() == LedgerEntry.EntryType.DEBIT
                            && e.getEntryDate() != null
                            && e.getEntryDate().isBefore(sevenDaysAgo))
                    .map(LedgerEntry::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            if (overdueAmount == null) overdueAmount = BigDecimal.ZERO;

            Optional<LocalDateTime> lastPayment = entries.stream()
                    .filter(e -> e.getEntryType() == LedgerEntry.EntryType.CREDIT && e.getEntryDate() != null)
                    .map(LedgerEntry::getEntryDate)
                    .max(LocalDateTime::compareTo);

            Optional<LocalDateTime> lastOrder = entries.stream()
                    .filter(e -> e.getRelatedOrder() != null && e.getEntryDate() != null)
                    .map(LedgerEntry::getEntryDate)
                    .max(LocalDateTime::compareTo);

            Optional<LocalDateTime> oldestDebit = entries.stream()
                    .filter(e -> e.getEntryType() == LedgerEntry.EntryType.DEBIT && e.getEntryDate() != null)
                    .map(LedgerEntry::getEntryDate)
                    .min(LocalDateTime::compareTo);
            long overdueDays = oldestDebit
                    .map(d -> ChronoUnit.DAYS.between(d.toLocalDate(), LocalDateTime.now().toLocalDate()))
                    .orElse(0L);

            Retailer retailer = retailerRepository.findById(retailerId).orElse(null);
            String retailerName = retailer != null && retailer.getUser() != null ? retailer.getUser().getName() : null;
            if (retailerName == null) retailerName = "";
            String shopName = retailer != null ? retailer.getShopName() : null;
            if (shopName == null) shopName = "";
            String phone = retailer != null ? retailer.getPhoneContact() : null;
            if (phone == null) phone = "";

            result.add(new RetailerDueDTO(
                    retailerId,
                    retailerName,
                    shopName,
                    phone,
                    totalDue,
                    overdueAmount,
                    lastPayment.orElse(null),
                    lastOrder.orElse(null),
                    overdueDays
            ));
        }

        // Also include retailers connected to this wholesaler even if they have no dues yet
        List<Connection> approvedConnections = connectionRepository
                .findByWholesalerAndStatusInOrderByRequestedAtDesc(
                        wholesaler,
                        List.of(Connection.Status.APPROVED, Connection.Status.BLOCKED));

        Set<UUID> existingIds = result.stream()
                .map(RetailerDueDTO::getRetailerId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        for (Connection conn : approvedConnections) {
            Retailer retailer = conn.getRetailer();
            if (retailer == null || retailer.getId() == null) continue;
            UUID retailerId = retailer.getId();
            if (existingIds.contains(retailerId)) continue;

            String retailerName = retailer.getUser() != null && retailer.getUser().getName() != null
                    ? retailer.getUser().getName()
                    : "";
            String shopName = retailer.getShopName() != null ? retailer.getShopName() : "";
            String phone = retailer.getPhoneContact() != null ? retailer.getPhoneContact() : "";

            result.add(new RetailerDueDTO(
                    retailerId,
                    retailerName,
                    shopName,
                    phone,
                    BigDecimal.ZERO,
                    BigDecimal.ZERO,
                    null,
                    null,
                    0L
            ));
        }

        result.sort(Comparator.comparing(RetailerDueDTO::getTotalDue, Comparator.nullsLast(Comparator.reverseOrder())));
        return result;
    }

    /**
     * Wholesaler records a manual payment from a retailer. Creates a CONFIRMED payment
     * and a CREDIT ledger entry to reduce outstanding.
     */
    @Transactional
    public void recordManualPayment(UUID wholesalerId, RecordPaymentRequest request) {
        Wholesaler wholesaler = wholesalerRepository.findById(wholesalerId)
                .orElseThrow(() -> new RuntimeException("Wholesaler not found"));
        Retailer retailer = retailerRepository.findById(request.getRetailerId())
                .orElseThrow(() -> new RuntimeException("Retailer not found"));
        assertWholesalerCanMutateRetailer(wholesaler, retailer);
        if (request.getOrderId() == null) {
            throw new RuntimeException("orderId is required for payment");
        }
        Order order = orderRepository.findById(request.getOrderId())
                .orElseThrow(() -> new RuntimeException("Order not found"));
        if (order.getWholesaler() == null || !order.getWholesaler().getId().equals(wholesaler.getId())) {
            throw new RuntimeException("Access denied: Order not linked to this wholesaler");
        }
        if (order.getRetailer() == null || !order.getRetailer().getId().equals(retailer.getId())) {
            throw new RuntimeException("Order does not belong to selected retailer");
        }
        if (order.getStatus() == Order.Status.PLACED || order.getStatus() == Order.Status.REJECTED || order.getStatus() == Order.Status.CANCELLED) {
            throw new RuntimeException("Cannot record payment for this order status");
        }
        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Invalid payment amount");
        }

        // Prevent overpayment for this order (CONFIRMED payments only).
        BigDecimal alreadyConfirmed = paymentRepository.findByOrder(order).stream()
                .filter(p -> p != null && p.getStatus() == Payment.PaymentStatus.CONFIRMED)
                .map(Payment::getAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal orderTotal = order.getTotalAmount() == null ? BigDecimal.ZERO : order.getTotalAmount();
        BigDecimal due = orderTotal.subtract(alreadyConfirmed);
        if (request.getAmount().compareTo(due.add(PAYMENT_TOLERANCE)) > 0) {
            throw new RuntimeException("Payment amount exceeds due amount");
        }

        Payment.PaymentMode paymentMode = Payment.PaymentMode.CASH;
        if (request.getMode() != null) {
            String m = request.getMode().toUpperCase();
            if ("UPI".equals(m)) paymentMode = Payment.PaymentMode.UPI;
            else if ("NEFT".equals(m)) paymentMode = Payment.PaymentMode.NEFT;
            else if ("CASH".equals(m)) paymentMode = Payment.PaymentMode.CASH;
        }

        LocalDateTime now = LocalDateTime.now();
        String orderNumber = order.getOrderNumber() != null ? order.getOrderNumber() : order.getId().toString();
        Payment payment = Payment.builder()
                .order(order)
                .wholesaler(wholesaler)
                .retailer(retailer)
                .amount(request.getAmount())
                .mode(paymentMode)
                .note(request.getNote())
                .status(Payment.PaymentStatus.CONFIRMED)
                .createdAt(now)
                .confirmedAt(now)
                .build();
        paymentRepository.save(payment);

        LedgerEntry entry = LedgerEntry.builder()
                .wholesaler(wholesaler)
                .retailer(retailer)
                .relatedOrder(order)
                .entryType(LedgerEntry.EntryType.CREDIT)
                .amount(request.getAmount())
                .description("Payment received for Order #" + orderNumber + " via " + paymentMode.name())
                .entryDate(now)
                .build();
        ledgerEntryRepository.save(entry);
    }

    /**
     * Full ledger statement for a retailer: all entries in chronological order
     * with running balance. Retailer must be connected to wholesaler (APPROVED).
     */
    @Transactional(readOnly = true)
    public RetailerStatementResponseDTO getRetailerStatement(UUID wholesalerId, UUID retailerId) {
        Wholesaler wholesaler = wholesalerRepository.findById(wholesalerId)
                .orElseThrow(() -> new RuntimeException("Wholesaler not found"));
        Retailer retailer = retailerRepository.findById(retailerId)
                .orElseThrow(() -> new RuntimeException("Retailer not found"));

        assertWholesalerCanReadRetailer(wholesaler, retailer);

        List<LedgerEntry> entries = ledgerEntryRepository.findByWholesalerAndRetailer(wholesaler, retailer);
        entries = entries.stream()
                .sorted(Comparator.comparing(LedgerEntry::getEntryDate))
                .toList();

        // Preload CONFIRMED payments for matching CREDIT ledger entries
        List<Payment> confirmedPayments = paymentRepository.findByWholesalerAndRetailer(wholesaler, retailer).stream()
                .filter(p -> p != null && p.getStatus() == Payment.PaymentStatus.CONFIRMED && p.getOrder() != null)
                .toList();

        BigDecimal balance = BigDecimal.ZERO;
        List<RetailerLedgerLineDTO> ledger = new ArrayList<>();
        Optional<LocalDateTime> oldestDebitDate = Optional.empty();

        for (LedgerEntry e : entries) {
            if (e.getEntryType() == LedgerEntry.EntryType.DEBIT) {
                if (e.getEntryDate() != null && oldestDebitDate.isEmpty()) {
                    oldestDebitDate = Optional.of(e.getEntryDate());
                }
            }
            balance = balance.add(LedgerAccounting.signedEffect(e));
            String desc = e.getDescription() != null ? e.getDescription() : "";
            UUID orderId = e.getRelatedOrder() != null ? e.getRelatedOrder().getId() : null;
            String orderNumber = e.getRelatedOrder() != null ? e.getRelatedOrder().getOrderNumber() : null;
            LocalDateTime orderDate = e.getRelatedOrder() != null ? e.getRelatedOrder().getPlacedAt() : null;
            String paymentMethod = null;
            LocalDateTime paymentDate = null;

            if ((e.getEntryType() == LedgerEntry.EntryType.CREDIT
                    || e.getEntryType() == LedgerEntry.EntryType.ORDER_PAYMENT_INFO) && orderId != null) {
                // best-effort match to a confirmed payment for this order
                Payment best = null;
                long bestScore = Long.MAX_VALUE;
                for (Payment p : confirmedPayments) {
                    if (p.getOrder() == null || p.getOrder().getId() == null) continue;
                    if (!p.getOrder().getId().equals(orderId)) continue;
                    if (p.getAmount() == null || e.getAmount() == null) continue;
                    if (p.getAmount().compareTo(e.getAmount()) != 0) continue;
                    LocalDateTime pdt = p.getConfirmedAt() != null ? p.getConfirmedAt() : p.getCreatedAt();
                    if (pdt == null || e.getEntryDate() == null) continue;
                    long diff = Math.abs(java.time.Duration.between(pdt, e.getEntryDate()).toSeconds());
                    if (diff < bestScore) {
                        bestScore = diff;
                        best = p;
                    }
                }
                if (best != null) {
                    paymentMethod = best.getMode() != null ? best.getMode().name() : null;
                    paymentDate = best.getConfirmedAt() != null ? best.getConfirmedAt() : best.getCreatedAt();
                }
            }

            ledger.add(new RetailerLedgerLineDTO(
                    e.getEntryDate(),
                    desc,
                    e.getEntryType().name(),
                    e.getAmount(),
                    balance,
                    orderId,
                    orderNumber,
                    orderDate,
                    paymentMethod,
                    paymentDate,
                    e.getEntryType() == LedgerEntry.EntryType.ORDER_PAYMENT_INFO
            ));
        }

        BigDecimal totalOutstanding = balance == null ? BigDecimal.ZERO : balance.max(BigDecimal.ZERO);
        long overdueDays = 0L;
        if (totalOutstanding.compareTo(BigDecimal.ZERO) > 0 && oldestDebitDate.isPresent()) {
            overdueDays = ChronoUnit.DAYS.between(
                    oldestDebitDate.get().toLocalDate(),
                    LocalDateTime.now().toLocalDate());
        }

        String retailerName = retailer.getUser() != null && retailer.getUser().getName() != null
                ? retailer.getUser().getName()
                : (retailer.getShopName() != null ? retailer.getShopName() : "Retailer");

        return new RetailerStatementResponseDTO(
                retailerId,
                retailerName,
                totalOutstanding,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                overdueDays,
                ledger
        );
    }

    /**
     * Credit summary for Retailer Profile: credit given / outstanding / limit from orders + payments;
     * profile fields from retailer row.
     */
    @Transactional(readOnly = true)
    public RetailerCreditSummaryDTO getRetailerCreditSummary(UUID wholesalerId, UUID retailerId) {
        Wholesaler wholesaler = wholesalerRepository.findById(wholesalerId)
                .orElseThrow(() -> new RuntimeException("Wholesaler not found"));
        Retailer retailer = retailerRepository.findById(retailerId)
                .orElseThrow(() -> new RuntimeException("Retailer not found"));

        Connection conn = assertWholesalerCanReadRetailer(wholesaler, retailer);

        List<Order> orders = orderRepository.findByWholesaler(wholesaler).stream()
                .filter(o -> o.getRetailer().getId().equals(retailerId))
                .toList();

        List<Payment> payments = paymentRepository.findByWholesalerAndRetailer(wholesaler, retailer);
        Map<UUID, BigDecimal> paidByOrderId = new HashMap<>();
        LocalDateTime lastPaymentAt = null;
        for (Payment p : payments) {
            if (p.getStatus() != Payment.PaymentStatus.CONFIRMED || p.getOrder() == null) {
                continue;
            }
            UUID oid = p.getOrder().getId();
            BigDecimal amt = p.getAmount() != null ? p.getAmount() : BigDecimal.ZERO;
            paidByOrderId.merge(oid, amt, BigDecimal::add);
            if (p.getConfirmedAt() != null) {
                if (lastPaymentAt == null || p.getConfirmedAt().isAfter(lastPaymentAt)) {
                    lastPaymentAt = p.getConfirmedAt();
                }
            }
        }

        BigDecimal totalOutstanding = BigDecimal.ZERO;
        BigDecimal outstandingAmount = BigDecimal.ZERO;
        BigDecimal overdueAmount = BigDecimal.ZERO;
        BigDecimal creditGiven = BigDecimal.ZERO;
        int overdueDays = 0;
        LocalDate today = LocalDate.now();
        Optional<LocalDateTime> lastOrderDate = Optional.empty();

        for (Order o : orders) {
            Order.Status st = o.getStatus();
            // Outstanding applies only after wholesaler acceptance (and beyond).
            // Exclude pending (PLACED) and rejected/cancelled.
            if (st == Order.Status.PLACED || st == Order.Status.CANCELLED || st == Order.Status.REJECTED) {
                continue;
            }

            BigDecimal total = o.getTotalAmount() != null ? o.getTotalAmount() : BigDecimal.ZERO;
            BigDecimal paid = paidByOrderId.getOrDefault(o.getId(), BigDecimal.ZERO);
            BigDecimal out = total.subtract(paid).max(BigDecimal.ZERO);

            if (o.getPaymentMode() == Order.PaymentMode.CREDIT && st != Order.Status.PLACED) {
                creditGiven = creditGiven.add(total);
            }

            if (o.getPlacedAt() != null) {
                if (lastOrderDate.isEmpty() || o.getPlacedAt().isAfter(lastOrderDate.get())) {
                    lastOrderDate = Optional.of(o.getPlacedAt());
                }
            }

            java.time.LocalDateTime effDue = null;
            if (o.getPlacedAt() != null && o.getCreditDays() != null && o.getCreditDays() > 0) {
                effDue = o.getPlacedAt().plusDays(o.getCreditDays());
            } else if (o.getDueDate() != null) {
                effDue = o.getDueDate();
            }
            boolean overdue = false;
            if (out.compareTo(BigDecimal.ZERO) > 0 && effDue != null) {
                LocalDate due = effDue.toLocalDate();
                if (due.isBefore(today)) {
                    int d = (int) ChronoUnit.DAYS.between(due, today);
                    overdueDays = Math.max(overdueDays, d);
                    overdue = true;
                }
            }

            if (out.compareTo(BigDecimal.ZERO) > 0) {
                if (overdue) {
                    overdueAmount = overdueAmount.add(out);
                } else {
                    outstandingAmount = outstandingAmount.add(out);
                }
                totalOutstanding = totalOutstanding.add(out);
            }
        }

        BigDecimal creditLimit = retailer.getCreditLimit() != null ? retailer.getCreditLimit() : BigDecimal.ZERO;
        BigDecimal availableCredit = creditLimit.subtract(totalOutstanding);
        if (availableCredit.compareTo(BigDecimal.ZERO) < 0) {
            availableCredit = BigDecimal.ZERO;
        }

        String retailerName = retailer.getUser() != null && retailer.getUser().getName() != null
                ? retailer.getUser().getName()
                : (retailer.getShopName() != null ? retailer.getShopName() : "Retailer");
        String proprietorName = retailer.getUser() != null && retailer.getUser().getName() != null
                ? retailer.getUser().getName()
                : retailerName;

        BigDecimal completedPurchase = orderRepository.sumCompletedOrderValueForRetailer(
                wholesalerId,
                retailerId,
                java.util.List.of(Order.Status.DELIVERED, Order.Status.COMPLETED, Order.Status.INVOICED));
        if (completedPurchase == null) {
            completedPurchase = BigDecimal.ZERO;
        }
        String tier = tierFromCompletedPurchase(completedPurchase);

        return RetailerCreditSummaryDTO.builder()
                .retailerId(retailerId)
                .retailerName(retailerName)
                .totalOutstanding(totalOutstanding)
                .outstandingAmount(outstandingAmount)
                .overdueAmount(overdueAmount)
                .creditGiven(creditGiven)
                .creditLimit(creditLimit)
                .availableCredit(availableCredit)
                .overdueDays(overdueDays)
                .lastPaymentDate(lastPaymentAt)
                .lastOrderDate(lastOrderDate.orElse(null))
                .shopName(retailer.getShopName() != null ? retailer.getShopName() : "")
                .phoneContact(retailer.getPhoneContact() != null ? retailer.getPhoneContact() : "")
                .address(retailer.getAddress() != null ? retailer.getAddress() : "")
                .region(retailer.getRegion() != null ? retailer.getRegion() : "")
                .city(retailer.getCity() != null ? retailer.getCity() : "")
                .state(retailer.getState() != null ? retailer.getState() : "")
                .proprietorName(proprietorName)
                .totalCompletedPurchaseValue(completedPurchase)
                .tier(tier)
                .connectionStatus(conn.getStatus().name())
                .build();
    }

    private static String tierFromCompletedPurchase(BigDecimal total) {
        double v = total != null ? total.doubleValue() : 0;
        if (v < 5000) {
            return "BEGINNER";
        }
        if (v < 25000) {
            return "BRONZE";
        }
        if (v < 100000) {
            return "SILVER";
        }
        if (v < 500000) {
            return "GOLD";
        }
        return "DIAMOND";
    }

    /**
     * Credit overview for all retailers connected to the wholesaler (APPROVED).
     * Used by Retailers list page.
     */
    @Transactional(readOnly = true)
    public List<RetailerCreditOverviewDTO> getAllRetailerCreditOverview(UUID wholesalerId) {
        Wholesaler wholesaler = wholesalerRepository.findById(wholesalerId)
                .orElseThrow(() -> new RuntimeException("Wholesaler not found"));

        List<Connection> approved = connectionRepository.findByWholesalerAndStatusInOrderByRequestedAtDesc(
                wholesaler,
                List.of(Connection.Status.APPROVED, Connection.Status.BLOCKED));

        List<RetailerCreditOverviewDTO> result = new ArrayList<>();
        for (Connection conn : approved) {
            Retailer retailer = conn.getRetailer();
            if (retailer == null) continue;

            List<LedgerEntry> entries = ledgerEntryRepository.findByWholesalerAndRetailer(wholesaler, retailer);

            BigDecimal outstanding = entries.stream()
                    .map(LedgerAccounting::signedEffect)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            if (outstanding == null) outstanding = BigDecimal.ZERO;
            outstanding = outstanding.max(BigDecimal.ZERO);

            int overdueDays = 0;
            if (outstanding.compareTo(BigDecimal.ZERO) > 0) {
                Optional<LocalDateTime> oldestDebit = entries.stream()
                        .filter(e -> e.getEntryType() == LedgerEntry.EntryType.DEBIT && e.getEntryDate() != null)
                        .map(LedgerEntry::getEntryDate)
                        .min(LocalDateTime::compareTo);
                if (oldestDebit.isPresent()) {
                    overdueDays = (int) ChronoUnit.DAYS.between(
                            oldestDebit.get().toLocalDate(),
                            LocalDateTime.now().toLocalDate());
                }
            }

            Optional<LocalDateTime> lastPaymentDate = entries.stream()
                    .filter(e -> e.getEntryType() == LedgerEntry.EntryType.CREDIT && e.getEntryDate() != null)
                    .map(LedgerEntry::getEntryDate)
                    .max(LocalDateTime::compareTo);

            String retailerName = retailer.getUser() != null && retailer.getUser().getName() != null
                    ? retailer.getUser().getName()
                    : "";
            String shopName = retailer.getShopName() != null ? retailer.getShopName() : "";

            result.add(new RetailerCreditOverviewDTO(
                    retailer.getId(),
                    retailerName,
                    shopName,
                    outstanding,
                    overdueDays,
                    lastPaymentDate.orElse(null)
            ));
        }
        return result;
    }

    private static boolean isReadableWholesalerRetailerConnection(Connection.Status s) {
        return s == Connection.Status.APPROVED
                || s == Connection.Status.BLOCKED
                || s == Connection.Status.REMOVED;
    }

    private static boolean isMutableWholesalerRetailerConnection(Connection.Status s) {
        return s == Connection.Status.APPROVED || s == Connection.Status.BLOCKED;
    }

    private Connection assertWholesalerCanReadRetailer(Wholesaler wholesaler, Retailer retailer) {
        Optional<Connection> opt = connectionRepository.findByWholesalerAndRetailer(wholesaler, retailer);
        if (opt.isEmpty()) {
            throw new RuntimeException("Retailer not connected to wholesaler");
        }
        Connection c = opt.get();
        if (!isReadableWholesalerRetailerConnection(c.getStatus())) {
            throw new RuntimeException("Retailer not connected to wholesaler");
        }
        return c;
    }

    private void assertWholesalerCanMutateRetailer(Wholesaler wholesaler, Retailer retailer) {
        Connection c = assertWholesalerCanReadRetailer(wholesaler, retailer);
        if (!isMutableWholesalerRetailerConnection(c.getStatus())) {
            throw new RuntimeException("This retailer has been removed from your active list");
        }
    }
}
