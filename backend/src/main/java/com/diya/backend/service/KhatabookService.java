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
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
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

    /**
     * Dashboard summary for Khatabook page: total outstanding, critical overdue,
     * collected this month, and count of retailers with outstanding > 0.
     */
    @Transactional(readOnly = true)
    public KhatabookSummaryDTO getKhatabookSummary(UUID wholesalerId) {
        Wholesaler wholesaler = wholesalerRepository.findById(wholesalerId)
                .orElseThrow(() -> new RuntimeException("Wholesaler not found: " + wholesalerId));

        List<LedgerEntry> allEntries = ledgerEntryRepository.findByWholesaler(wholesaler);

        // 1) totalOutstanding = Sum(DEBIT) - Sum(CREDIT)
        BigDecimal totalOutstanding = allEntries.stream()
                .map(e -> e.getEntryType() == LedgerEntry.EntryType.DEBIT ? e.getAmount() : e.getAmount().negate())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (totalOutstanding == null) totalOutstanding = BigDecimal.ZERO;

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

        // 4) retailerCount: unique retailers with outstanding > 0
        Map<UUID, BigDecimal> perRetailer = allEntries.stream()
                .collect(Collectors.groupingBy(
                        e -> e.getRetailer().getId(),
                        Collectors.reducing(BigDecimal.ZERO,
                                e -> e.getEntryType() == LedgerEntry.EntryType.DEBIT ? e.getAmount() : e.getAmount().negate(),
                                BigDecimal::add)));
        long retailerCount = perRetailer.values().stream()
                .filter(bal -> bal != null && bal.compareTo(BigDecimal.ZERO) > 0)
                .count();

        return new KhatabookSummaryDTO(
                totalOutstanding,
                criticalOverdue,
                collectedThisMonth,
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

        List<RetailerDueDTO> result = new ArrayList<>();

        for (Map.Entry<UUID, List<LedgerEntry>> entry : byRetailer.entrySet()) {
            UUID retailerId = entry.getKey();
            List<LedgerEntry> entries = entry.getValue();

            BigDecimal totalDue = entries.stream()
                    .map(e -> e.getEntryType() == LedgerEntry.EntryType.DEBIT ? e.getAmount() : e.getAmount().negate())
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            if (totalDue == null) {
                totalDue = BigDecimal.ZERO;
            }

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
                .findByWholesalerAndStatusOrderByRequestedAtDesc(wholesaler, Connection.Status.APPROVED);

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

        Payment.PaymentMode paymentMode = Payment.PaymentMode.CASH;
        if (request.getMode() != null) {
            String m = request.getMode().toUpperCase();
            if ("UPI".equals(m)) paymentMode = Payment.PaymentMode.UPI;
            else if ("NEFT".equals(m)) paymentMode = Payment.PaymentMode.NEFT;
            else if ("CASH".equals(m)) paymentMode = Payment.PaymentMode.CASH;
        }

        LocalDateTime now = LocalDateTime.now();
        Payment payment = Payment.builder()
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
                .entryType(LedgerEntry.EntryType.CREDIT)
                .amount(request.getAmount())
                .description("Manual payment recorded")
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

        Optional<Connection> connection = connectionRepository.findByWholesalerAndRetailer(wholesaler, retailer);
        if (connection.isEmpty() || connection.get().getStatus() != Connection.Status.APPROVED) {
            throw new RuntimeException("Retailer not connected to wholesaler");
        }

        List<LedgerEntry> entries = ledgerEntryRepository.findByWholesalerAndRetailer(wholesaler, retailer);
        entries = entries.stream()
                .sorted(Comparator.comparing(LedgerEntry::getEntryDate))
                .toList();

        BigDecimal balance = BigDecimal.ZERO;
        List<RetailerLedgerLineDTO> ledger = new ArrayList<>();
        Optional<LocalDateTime> oldestDebitDate = Optional.empty();

        for (LedgerEntry e : entries) {
            if (e.getEntryType() == LedgerEntry.EntryType.DEBIT) {
                balance = balance.add(e.getAmount());
                if (e.getEntryDate() != null && oldestDebitDate.isEmpty()) {
                    oldestDebitDate = Optional.of(e.getEntryDate());
                }
            } else {
                balance = balance.subtract(e.getAmount());
            }
            String desc = e.getDescription() != null ? e.getDescription() : "";
            UUID orderId = e.getRelatedOrder() != null ? e.getRelatedOrder().getId() : null;
            ledger.add(new RetailerLedgerLineDTO(
                    e.getEntryDate(),
                    desc,
                    e.getEntryType().name(),
                    e.getAmount(),
                    balance,
                    orderId
            ));
        }

        BigDecimal totalOutstanding = balance;
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

        Optional<Connection> connection = connectionRepository.findByWholesalerAndRetailer(wholesaler, retailer);
        if (connection.isEmpty() || connection.get().getStatus() != Connection.Status.APPROVED) {
            throw new RuntimeException("Retailer not connected to wholesaler");
        }

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
        BigDecimal creditGiven = BigDecimal.ZERO;
        int overdueDays = 0;
        LocalDate today = LocalDate.now();
        Optional<LocalDateTime> lastOrderDate = Optional.empty();

        for (Order o : orders) {
            Order.Status st = o.getStatus();
            if (st == Order.Status.CANCELLED || st == Order.Status.REJECTED) {
                continue;
            }

            BigDecimal total = o.getTotalAmount() != null ? o.getTotalAmount() : BigDecimal.ZERO;
            BigDecimal paid = paidByOrderId.getOrDefault(o.getId(), BigDecimal.ZERO);
            BigDecimal out = total.subtract(paid).max(BigDecimal.ZERO);
            totalOutstanding = totalOutstanding.add(out);

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
            if (out.compareTo(BigDecimal.ZERO) > 0 && effDue != null) {
                LocalDate due = effDue.toLocalDate();
                if (due.isBefore(today)) {
                    int d = (int) ChronoUnit.DAYS.between(due, today);
                    overdueDays = Math.max(overdueDays, d);
                }
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
                .creditGiven(creditGiven)
                .creditLimit(creditLimit)
                .availableCredit(availableCredit)
                .overdueDays(overdueDays)
                .lastPaymentDate(lastPaymentAt)
                .lastOrderDate(lastOrderDate.orElse(null))
                .shopName(retailer.getShopName() != null ? retailer.getShopName() : "")
                .phoneContact(retailer.getPhoneContact() != null ? retailer.getPhoneContact() : "")
                .address(retailer.getAddress() != null ? retailer.getAddress() : "")
                .city(retailer.getCity() != null ? retailer.getCity() : "")
                .state(retailer.getState() != null ? retailer.getState() : "")
                .proprietorName(proprietorName)
                .totalCompletedPurchaseValue(completedPurchase)
                .tier(tier)
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

        List<Connection> approved = connectionRepository.findByWholesalerAndStatusOrderByRequestedAtDesc(
                wholesaler, Connection.Status.APPROVED);

        List<RetailerCreditOverviewDTO> result = new ArrayList<>();
        for (Connection conn : approved) {
            Retailer retailer = conn.getRetailer();
            if (retailer == null) continue;

            List<LedgerEntry> entries = ledgerEntryRepository.findByWholesalerAndRetailer(wholesaler, retailer);

            BigDecimal outstanding = entries.stream()
                    .map(e -> e.getEntryType() == LedgerEntry.EntryType.DEBIT ? e.getAmount() : e.getAmount().negate())
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            if (outstanding == null) outstanding = BigDecimal.ZERO;

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
}
