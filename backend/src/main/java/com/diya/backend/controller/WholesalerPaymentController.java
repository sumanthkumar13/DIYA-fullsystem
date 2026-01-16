package com.diya.backend.controller;

import com.diya.backend.entity.Payment;
import com.diya.backend.entity.Wholesaler;
import com.diya.backend.repository.PaymentRepository;
import com.diya.backend.repository.WholesalerRepository;
import com.diya.backend.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/wholesaler/payments")
@RequiredArgsConstructor
public class WholesalerPaymentController {

    private final PaymentService paymentService;
    private final PaymentRepository paymentRepository;
    private final WholesalerRepository wholesalerRepository;

    // ✅ List all payments of wholesaler (dashboard)
    @GetMapping
    public ResponseEntity<List<Payment>> getAllPayments() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String identifier = auth.getName();

        Wholesaler wholesaler = identifier.contains("@")
                ? wholesalerRepository.findByUserEmail(identifier)
                        .orElseThrow(() -> new RuntimeException("Wholesaler not found"))
                : wholesalerRepository.findByUserPhone(identifier)
                        .orElseThrow(() -> new RuntimeException("Wholesaler not found"));

        List<Payment> payments = paymentRepository.findByWholesaler(wholesaler);
        return ResponseEntity.ok(payments);
    }

    // ✅ Pending verification payments (most important screen)
    @GetMapping("/pending")
    public ResponseEntity<List<Payment>> getPendingPayments() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String identifier = auth.getName();

        Wholesaler wholesaler = identifier.contains("@")
                ? wholesalerRepository.findByUserEmail(identifier)
                        .orElseThrow(() -> new RuntimeException("Wholesaler not found"))
                : wholesalerRepository.findByUserPhone(identifier)
                        .orElseThrow(() -> new RuntimeException("Wholesaler not found"));

        List<Payment> payments = paymentRepository.findByWholesalerAndStatus(
                wholesaler,
                Payment.PaymentStatus.PENDING_VERIFICATION);

        return ResponseEntity.ok(payments);
    }

    // ✅ Confirm payment
    @PostMapping("/{paymentId}/confirm")
    public ResponseEntity<Payment> confirmPayment(@PathVariable UUID paymentId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String identifier = auth.getName();

        Payment confirmed = paymentService.confirmPayment(identifier, paymentId);
        return ResponseEntity.ok(confirmed);
    }

    // ✅ Reject payment
    @PostMapping("/{paymentId}/reject")
    public ResponseEntity<Payment> rejectPayment(
            @PathVariable UUID paymentId,
            @RequestBody(required = false) Map<String, Object> body) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String identifier = auth.getName();

        String reason = "Payment not received";
        if (body != null && body.get("reason") != null) {
            reason = body.get("reason").toString();
        }

        Payment rejected = paymentService.rejectPayment(identifier, paymentId, reason);
        return ResponseEntity.ok(rejected);
    }
}
