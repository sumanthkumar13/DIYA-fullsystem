package com.diya.backend.controller;

import com.diya.backend.dto.payment.RetailerPaymentHistoryItemDTO;
import com.diya.backend.entity.Payment;
import com.diya.backend.entity.Retailer;
import com.diya.backend.repository.RetailerRepository;
import com.diya.backend.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/retailer/payments")
@RequiredArgsConstructor
public class RetailerPaymentController {

    private final PaymentService paymentService;
    private final RetailerRepository retailerRepository;

    // ✅ Retailer marks a payment for an order (CASH / UPI / NEFT / NET_BANKING)
    @PostMapping
    public ResponseEntity<RetailerPaymentHistoryItemDTO> recordPayment(@RequestBody Map<String, Object> body) {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String identifier = auth.getName(); // email OR phone

        UUID orderId = UUID.fromString((String) body.get("orderId"));
        BigDecimal amount = new BigDecimal(body.get("amount").toString());

        // accept both keys to maintain compatibility
        String mode = (String) body.getOrDefault("mode",
                body.getOrDefault("method", "CASH"));

        String reference = (String) body.getOrDefault("reference", null);
        String note = (String) body.getOrDefault("note", null);

        Payment payment = paymentService.recordPayment(identifier, orderId, amount, mode, reference, note);

        return ResponseEntity.ok(paymentService.toRetailerPaymentHistoryItem(payment));
    }

    // ✅ Retailer payment history (flat DTO list — all payments, newest first)
    @GetMapping
    public ResponseEntity<List<RetailerPaymentHistoryItemDTO>> getRetailerPayments() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String identifier = auth.getName(); // email OR phone

        Retailer retailer = identifier.contains("@")
                ? retailerRepository.findByUserEmail(identifier)
                        .orElseThrow(() -> new RuntimeException("Retailer not found"))
                : retailerRepository.findByUserPhone(identifier)
                        .orElseThrow(() -> new RuntimeException("Retailer not found"));

        return ResponseEntity.ok(paymentService.getRetailerPaymentHistory(retailer));
    }
}
