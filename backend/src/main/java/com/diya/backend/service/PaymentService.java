package com.diya.backend.service;

import com.diya.backend.entity.*;
import com.diya.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final OrderRepository orderRepository;
    private final RetailerRepository retailerRepository;
    private final WholesalerRepository wholesalerRepository;
    private final LedgerEntryRepository ledgerEntryRepository;

    // ==========================================================
    // 1) Retailer records payment (UPI/CASH/NEFT/NETBANKING)
    // Creates payment as PENDING_VERIFICATION
    // ==========================================================
    @Transactional
    public Payment recordPayment(
            String retailerIdentifier,
            UUID orderId,
            Double amount,
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

        if (amount == null || amount <= 0) {
            throw new RuntimeException("Invalid payment amount");
        }

        // do not accept payment greater than pending due (optional strict rule)
        double alreadyConfirmed = paymentRepository.findByOrder(order).stream()
                .filter(p -> p.getStatus() == Payment.PaymentStatus.CONFIRMED)
                .mapToDouble(Payment::getAmount)
                .sum();

        double due = (order.getTotalAmount() == null ? 0.0 : order.getTotalAmount()) - alreadyConfirmed;
        if (amount > due + 0.01) {
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
                .reference(reference)
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
            return payment;
        }
        if (payment.getStatus() == Payment.PaymentStatus.REJECTED) {
            throw new RuntimeException("Payment already rejected");
        }

        payment.setStatus(Payment.PaymentStatus.CONFIRMED);
        payment.setConfirmedAt(LocalDateTime.now());
        payment.setConfirmedBy(wholesalerIdentifier);

        paymentRepository.save(payment);

        // ✅ Ledger Entry happens ONLY at confirmation time
        LedgerEntry ledgerEntry = LedgerEntry.builder()
                .wholesaler(wholesaler)
                .retailer(payment.getRetailer())
                .entryType(LedgerEntry.EntryType.CREDIT) // CREDIT = retailer paid
                .amount(payment.getAmount())
                .description("Payment confirmed (" + payment.getMode().name() + ") Ref: "
                        + (payment.getReference() == null ? "-" : payment.getReference()))
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
    private void updateOrderPaymentStatus(Order order) {
        List<Payment> allPayments = paymentRepository.findByOrder(order);

        double totalConfirmedPaid = allPayments.stream()
                .filter(p -> p.getStatus() == Payment.PaymentStatus.CONFIRMED)
                .mapToDouble(Payment::getAmount)
                .sum();

        double totalOrderAmount = order.getTotalAmount() == null ? 0.0 : order.getTotalAmount();

        if (totalConfirmedPaid <= 0) {
            order.setPaymentStatus(Order.PaymentStatus.UNPAID);
        } else if (totalConfirmedPaid + 0.01 < totalOrderAmount) {
            order.setPaymentStatus(Order.PaymentStatus.PARTIAL);
        } else {
            order.setPaymentStatus(Order.PaymentStatus.PAID);
        }

        orderRepository.save(order);
    }
}
