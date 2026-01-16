package com.diya.backend.controller;

import com.diya.backend.entity.Payment;
import com.diya.backend.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/retailer/payments")
@RequiredArgsConstructor
public class RetailerPaymentController {

    private final PaymentService paymentService;

    // ✅ Retailer marks a payment for an order (CASH / UPI / NEFT / NET_BANKING)
    @PostMapping
    public ResponseEntity<Payment> recordPayment(@RequestBody Map<String, Object> body) {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String identifier = auth.getName(); // email OR phone

        UUID orderId = UUID.fromString((String) body.get("orderId"));
        Double amount = Double.valueOf(body.get("amount").toString());

        // accept both keys to maintain compatibility
        String mode = (String) body.getOrDefault("mode",
                body.getOrDefault("method", "CASH"));

        String reference = (String) body.getOrDefault("reference", null);
        String note = (String) body.getOrDefault("note", null);

        Payment payment = paymentService.recordPayment(identifier, orderId, amount, mode, reference, note);

        return ResponseEntity.ok(payment);
    }
}
