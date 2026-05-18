package com.diya.backend.service;

import com.diya.backend.dto.payment.RetailerPaymentHistoryItemDTO;
import com.diya.backend.entity.*;
import com.diya.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final OrderRepository orderRepository;
    private final RetailerRepository retailerRepository;
    private final WholesalerRepository wholesalerRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final LedgerService ledgerService;

    // ==========================================================
    // 1) Retailer records payment (UPI/CASH/NEFT/NETBANKING)
    // Creates payment as PENDING_VERIFICATION
    // ==========================================================
    private static final BigDecimal TOLERANCE = new BigDecimal("0.01");

    /**
     * Maps a payment to a flat DTO safe for retailer clients (no circular JPA/Jackson graphs).
     */
    public RetailerPaymentHistoryItemDTO toRetailerPaymentHistoryItem(Payment payment) {
        if (payment == null) {
            throw new RuntimeException("Payment not found");
        }
        Order order = payment.getOrder();
        UUID orderId = order != null ? order.getId() : null;
        String orderNumber = order != null ? order.getOrderNumber() : null;
        return RetailerPaymentHistoryItemDTO.builder()
                .id(payment.getId())
                .amount(payment.getAmount())
                .mode(payment.getMode() != null ? payment.getMode().name() : null)
                .status(payment.getStatus() != null ? payment.getStatus().name() : null)
                .reference(payment.getReference())
                .note(payment.getNote())
                .createdAt(payment.getCreatedAt())
                .confirmedAt(payment.getConfirmedAt())
                .rejectedAt(payment.getRejectedAt())
                .orderId(orderId)
                .orderNumber(orderNumber)
                .source(resolvePaymentSource(payment))
                .build();
    }

    public List<RetailerPaymentHistoryItemDTO> getRetailerPaymentHistory(Retailer retailer) {
        return paymentRepository.findByRetailerWithOrderOrderByCreatedAtDesc(retailer).stream()
                .filter(Objects::nonNull)
                .map(this::toRetailerPaymentHistoryItem)
                .collect(Collectors.toList());
    }

    private static String resolvePaymentSource(Payment payment) {
        String note = payment.getNote();
        if (note != null && note.toLowerCase().contains("acceptance")) {
            return "IMMEDIATE";
        }
        return "RETAILER";
    }

    @Transactional
    public Payment recordPayment(
            String retailerIdentifier,
            UUID orderId,
            BigDecimal amount,
            String mode,
            String reference,
            String note) {
        Retailer retailer = retailerIdentifier.contains("@")
                ? retailerRepository.findByUserEmail(retailerIdentifier)
                        .orElseThrow(() -> new RuntimeException("Retailer not found"))
                : retailerRepository.findByUserPhone(retailerIdentifier)
                        .orElseThrow(() -> new RuntimeException("Retailer not found"));

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        // ownership check: retailer can pay only his order
        if (!order.getRetailer().getId().equals(retailer.getId())) {
            throw new RuntimeException("Access denied: Order not linked to this retailer");
        }

        // Only allow recording payments after order is accepted (or later)
        if (order.getStatus() == Order.Status.PLACED || order.getStatus() == Order.Status.REJECTED || order.getStatus() == Order.Status.CANCELLED) {
            throw new RuntimeException("Cannot record payment for this order status");
        }

        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Invalid payment amount");
        }

        // Best-effort duplicate protection: same reference for same retailer/wholesaler should not be recorded twice.
        if (reference != null && !reference.isBlank()) {
            String ref = reference.trim();
            boolean duplicate = paymentRepository
                    .findByWholesalerAndRetailerAndReferenceIgnoreCase(order.getWholesaler(), retailer, ref)
                    .stream()
                    .anyMatch(p -> p != null
                            && p.getStatus() != Payment.PaymentStatus.REJECTED
                            && p.getStatus() != Payment.PaymentStatus.FAILED);
            if (duplicate) {
                throw new RuntimeException("Duplicate payment reference detected");
            }
        }

        // Do not accept payment greater than due for this order (CONFIRMED payments only).
        // This supports partial payments.
        BigDecimal alreadyConfirmed = paymentRepository.findByOrder(order).stream()
                .filter(p -> p.getStatus() == Payment.PaymentStatus.CONFIRMED)
                .map(Payment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal orderTotal = order.getTotalAmount() == null ? BigDecimal.ZERO : order.getTotalAmount();
        BigDecimal due = orderTotal.subtract(alreadyConfirmed);
        if (amount.compareTo(due.add(TOLERANCE)) > 0) {
            throw new RuntimeException("Payment amount exceeds due amount");
        }

        Wholesaler wholesaler = order.getWholesaler();

        Payment.PaymentMode paymentMode;
        try {
            paymentMode = Payment.PaymentMode.valueOf(mode.toUpperCase());
        } catch (Exception e) {
            throw new RuntimeException("Invalid payment mode: " + mode);
        }

        Payment payment = Payment.builder()
                .order(order)
                .wholesaler(wholesaler)
                .retailer(retailer)
                .amount(amount)
                .mode(paymentMode)
                .status(Payment.PaymentStatus.PENDING_VERIFICATION)
                .reference(reference != null ? reference.trim() : null)
                .note(note)
                .createdAt(LocalDateTime.now())
                .build();

        return paymentRepository.save(payment);
    }

    // ==========================================================
    // 2) Wholesaler confirms payment
    // This is the ONLY time we update ledger/kata/outstanding
    // ==========================================================
    @Transactional
    public Payment confirmPayment(String wholesalerIdentifier, UUID paymentId) {

        Wholesaler wholesaler = wholesalerIdentifier.contains("@")
                ? wholesalerRepository.findByUserEmail(wholesalerIdentifier)
                        .orElseThrow(() -> new RuntimeException("Wholesaler not found"))
                : wholesalerRepository.findByUserPhone(wholesalerIdentifier)
                        .orElseThrow(() -> new RuntimeException("Wholesaler not found"));

        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new RuntimeException("Payment not found"));

        if (!payment.getWholesaler().getId().equals(wholesaler.getId())) {
            throw new RuntimeException("Access denied: Payment not linked to this wholesaler");
        }

        // prevent double confirm
        if (payment.getStatus() == Payment.PaymentStatus.CONFIRMED) {
            throw new RuntimeException("Payment already confirmed");
        }
        if (payment.getStatus() == Payment.PaymentStatus.REJECTED) {
            throw new RuntimeException("Payment already rejected");
        }

        // Safety: don't allow confirming more than current outstanding for this retailer-wholesaler pair
        java.math.BigDecimal outstanding = ledgerService.getOutstandingForPair(wholesaler, payment.getRetailer());
        if (payment.getAmount() == null || payment.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Invalid payment amount");
        }
        if (payment.getAmount().compareTo(outstanding.add(TOLERANCE)) > 0) {
            throw new RuntimeException("Payment amount exceeds outstanding amount");
        }

        payment.setStatus(Payment.PaymentStatus.CONFIRMED);
        payment.setConfirmedAt(LocalDateTime.now());
        payment.setConfirmedBy(wholesalerIdentifier);

        paymentRepository.save(payment);

        // ✅ Ledger Entry happens ONLY at confirmation time
        LedgerEntry ledgerEntry = LedgerEntry.builder()
                .wholesaler(wholesaler)
                .retailer(payment.getRetailer())
                .relatedOrder(payment.getOrder())
                .entryType(LedgerEntry.EntryType.CREDIT) // CREDIT = retailer paid
                .amount(payment.getAmount())
                .description("Payment received")
                .entryDate(LocalDateTime.now())
                .build();

        ledgerEntryRepository.save(ledgerEntry);

        // update order payment status
        updateOrderPaymentStatus(payment.getOrder());

        return payment;
    }

    // ==========================================================
    // 3) Wholesaler rejects payment
    // ==========================================================
    @Transactional
    public Payment rejectPayment(String wholesalerIdentifier, UUID paymentId, String reason) {

        Wholesaler wholesaler = wholesalerIdentifier.contains("@")
                ? wholesalerRepository.findByUserEmail(wholesalerIdentifier)
                        .orElseThrow(() -> new RuntimeException("Wholesaler not found"))
                : wholesalerRepository.findByUserPhone(wholesalerIdentifier)
                        .orElseThrow(() -> new RuntimeException("Wholesaler not found"));

        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new RuntimeException("Payment not found"));

        if (!payment.getWholesaler().getId().equals(wholesaler.getId())) {
            throw new RuntimeException("Access denied: Payment not linked to this wholesaler");
        }

        if (payment.getStatus() == Payment.PaymentStatus.CONFIRMED) {
            throw new RuntimeException("Payment already confirmed. Cannot reject.");
        }

        payment.setStatus(Payment.PaymentStatus.REJECTED);
        payment.setRejectedAt(LocalDateTime.now());
        payment.setNote((payment.getNote() == null ? "" : payment.getNote() + " | ") + "Rejected: " + reason);

        return paymentRepository.save(payment);
    }

    // ==========================================================
    // Internal helper: update order payment status based on CONFIRMED payments only
    // ==========================================================
    private static final BigDecimal PAYMENT_TOLERANCE = new BigDecimal("0.01");

    private void updateOrderPaymentStatus(Order order) {
        List<Payment> allPayments = paymentRepository.findByOrder(order);

        BigDecimal totalConfirmedPaid = allPayments.stream()
                .filter(p -> p.getStatus() == Payment.PaymentStatus.CONFIRMED)
                .map(Payment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalOrderAmount = order.getTotalAmount() == null ? BigDecimal.ZERO : order.getTotalAmount();

        if (totalConfirmedPaid.compareTo(BigDecimal.ZERO) <= 0) {
            order.setPaymentStatus(Order.PaymentStatus.UNPAID);
        } else if (totalConfirmedPaid.add(PAYMENT_TOLERANCE).compareTo(totalOrderAmount) < 0) {
            order.setPaymentStatus(Order.PaymentStatus.PARTIAL);
        } else {
            order.setPaymentStatus(Order.PaymentStatus.PAID);
        }

        orderRepository.save(order);
    }

    // ==========================================================
    // 4) Wholesaler records an immediate payment at acceptance
    // Creates payment as CONFIRMED; ledger line is ORDER_PAYMENT_INFO (does not reduce credit balance).
    // ==========================================================
    @Transactional
    public Payment recordImmediateWholesalerPayment(
            String wholesalerIdentifier,
            Order order,
            BigDecimal amount,
            Payment.PaymentMode mode,
            String reference,
            String note
    ) {
        if (order == null || order.getId() == null) {
            throw new RuntimeException("Order not found");
        }
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Invalid payment amount");
        }

        Wholesaler wholesaler = wholesalerIdentifier.contains("@")
                ? wholesalerRepository.findByUserEmail(wholesalerIdentifier)
                        .orElseThrow(() -> new RuntimeException("Wholesaler not found"))
                : wholesalerRepository.findByUserPhone(wholesalerIdentifier)
                        .orElseThrow(() -> new RuntimeException("Wholesaler not found"));

        if (order.getWholesaler() == null || order.getWholesaler().getId() == null
                || !order.getWholesaler().getId().equals(wholesaler.getId())) {
            throw new RuntimeException("Access denied: Order not linked to this wholesaler");
        }

        // Clamp to remaining due for this order (based on CONFIRMED payments only)
        BigDecimal alreadyConfirmed = paymentRepository.findByOrder(order).stream()
                .filter(p -> p.getStatus() == Payment.PaymentStatus.CONFIRMED)
                .map(Payment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal orderTotal = order.getTotalAmount() == null ? BigDecimal.ZERO : order.getTotalAmount();
        BigDecimal due = orderTotal.subtract(alreadyConfirmed);
        if (amount.compareTo(due.add(TOLERANCE)) > 0) {
            throw new RuntimeException("Payment amount exceeds due amount");
        }

        if (mode == null) {
            throw new RuntimeException("Payment mode is required");
        }

        Payment payment = Payment.builder()
                .order(order)
                .wholesaler(wholesaler)
                .retailer(order.getRetailer())
                .amount(amount)
                .mode(mode)
                .status(Payment.PaymentStatus.CONFIRMED)
                .reference(reference)
                .note(note)
                .createdAt(LocalDateTime.now())
                .confirmedAt(LocalDateTime.now())
                .confirmedBy(wholesalerIdentifier)
                .build();

        paymentRepository.save(payment);

        LedgerEntry ledgerEntry = LedgerEntry.builder()
                .wholesaler(wholesaler)
                .retailer(order.getRetailer())
                .relatedOrder(order)
                .entryType(LedgerEntry.EntryType.ORDER_PAYMENT_INFO)
                .amount(amount)
                .description("Paid ₹" + amount.toPlainString() + " via " + mode.name()
                        + " (at order acceptance)")
                .entryDate(LocalDateTime.now())
                .build();

        ledgerEntryRepository.save(ledgerEntry);

        updateOrderPaymentStatus(order);
        return payment;
    }
}
