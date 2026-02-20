package com.diya.backend.controller;

import com.diya.backend.dto.khatabook.KhatabookSummaryDTO;
import com.diya.backend.dto.khatabook.RecordPaymentRequest;
import com.diya.backend.dto.khatabook.RetailerDueDTO;
import com.diya.backend.dto.khatabook.RetailerStatementResponseDTO;
import com.diya.backend.dto.retailer.RetailerCreditOverviewDTO;
import com.diya.backend.dto.retailer.RetailerCreditSummaryDTO;
import com.diya.backend.entity.LedgerEntry;
import com.diya.backend.entity.Retailer;
import com.diya.backend.entity.User;
import com.diya.backend.entity.Wholesaler;
import com.diya.backend.repository.RetailerRepository;
import com.diya.backend.repository.UserRepository;
import com.diya.backend.repository.WholesalerRepository;
import com.diya.backend.service.KhatabookService;
import com.diya.backend.service.LedgerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/ledger")
@RequiredArgsConstructor
public class LedgerController {

    private final LedgerService ledgerService;
    private final KhatabookService khatabookService;
    private final WholesalerRepository wholesalerRepository;
    private final RetailerRepository retailerRepository;
    private final UserRepository userRepository;

    // ==========================================================
    // WHOLESALER: Khatabook dashboard summary (top cards)
    // ==========================================================
    @GetMapping("/wholesaler/summary")
    public ResponseEntity<?> getWholesalerSummary() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String identifier = auth.getName();

        User user = identifier.contains("@")
                ? userRepository.findByEmail(identifier).orElse(null)
                : userRepository.findByPhone(identifier).orElse(null);
        if (user == null || user.getRole() != User.Role.WHOLESALER) {
            return ResponseEntity.notFound().build();
        }

        Wholesaler wholesaler = wholesalerRepository.findByUserId(user.getId()).orElse(null);
        if (wholesaler == null) {
            return ResponseEntity.notFound().build();
        }

        KhatabookSummaryDTO summary = khatabookService.getKhatabookSummary(wholesaler.getId());
        return ResponseEntity.ok(summary);
    }

    // ==========================================================
    // WHOLESALER: retailer-wise dues list (Khatabook)
    // ==========================================================
    @GetMapping("/wholesaler/retailers")
    public ResponseEntity<?> getWholesalerRetailerDues() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String identifier = auth.getName();

        User user = identifier.contains("@")
                ? userRepository.findByEmail(identifier).orElse(null)
                : userRepository.findByPhone(identifier).orElse(null);
        if (user == null || user.getRole() != User.Role.WHOLESALER) {
            return ResponseEntity.notFound().build();
        }

        Wholesaler wholesaler = wholesalerRepository.findByUserId(user.getId()).orElse(null);
        if (wholesaler == null) {
            return ResponseEntity.notFound().build();
        }

        List<RetailerDueDTO> list = khatabookService.getRetailerDues(wholesaler.getId());
        return ResponseEntity.ok(list);
    }

    // ==========================================================
    // WHOLESALER: credit overview for all connected retailers (Retailers list)
    // ==========================================================
    @GetMapping("/wholesaler/retailers/credit-overview")
    public ResponseEntity<?> getRetailersCreditOverview() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String identifier = auth.getName();

        User user = identifier.contains("@")
                ? userRepository.findByEmail(identifier).orElse(null)
                : userRepository.findByPhone(identifier).orElse(null);
        if (user == null || user.getRole() != User.Role.WHOLESALER) {
            return ResponseEntity.notFound().build();
        }

        Wholesaler wholesaler = wholesalerRepository.findByUserId(user.getId()).orElse(null);
        if (wholesaler == null) {
            return ResponseEntity.notFound().build();
        }

        List<RetailerCreditOverviewDTO> list = khatabookService.getAllRetailerCreditOverview(wholesaler.getId());
        return ResponseEntity.ok(list);
    }

    // ==========================================================
    // WHOLESALER: record manual payment (Add Payment)
    // ==========================================================
    @PostMapping("/wholesaler/record-payment")
    public ResponseEntity<?> recordPayment(@RequestBody RecordPaymentRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String identifier = auth.getName();

        User user = identifier.contains("@")
                ? userRepository.findByEmail(identifier).orElse(null)
                : userRepository.findByPhone(identifier).orElse(null);
        if (user == null || user.getRole() != User.Role.WHOLESALER) {
            return ResponseEntity.notFound().build();
        }

        Wholesaler wholesaler = wholesalerRepository.findByUserId(user.getId()).orElse(null);
        if (wholesaler == null) {
            return ResponseEntity.notFound().build();
        }

        khatabookService.recordManualPayment(wholesaler.getId(), request);
        return ResponseEntity.ok().build();
    }

    // ==========================================================
    // WHOLESALER: ledger view (all entries)
    // ==========================================================
    @GetMapping("/wholesaler")
    public ResponseEntity<List<LedgerEntry>> getWholesalerLedger(
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(required = false) String type) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String identifier = auth.getName();

        LocalDate from = fromDate != null ? LocalDate.parse(fromDate) : null;
        LocalDate to = toDate != null ? LocalDate.parse(toDate) : null;

        return ResponseEntity.ok(ledgerService.getWholesalerLedger(identifier, from, to, type));
    }

    // ==========================================================
    // RETAILER: ledger view (all entries)
    // ==========================================================
    @GetMapping("/retailer")
    public ResponseEntity<List<LedgerEntry>> getRetailerLedger(
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(required = false) String type) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String identifier = auth.getName();

        LocalDate from = fromDate != null ? LocalDate.parse(fromDate) : null;
        LocalDate to = toDate != null ? LocalDate.parse(toDate) : null;

        return ResponseEntity.ok(ledgerService.getRetailerLedger(identifier, from, to, type));
    }

    // ==========================================================
    // WHOLESALER: Retailer statement (full ledger with running balance)
    // ==========================================================
    @GetMapping("/wholesaler/retailer/{retailerId}/statement")
    public ResponseEntity<?> getRetailerStatementForWholesaler(@PathVariable UUID retailerId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String identifier = auth.getName();

        User user = identifier.contains("@")
                ? userRepository.findByEmail(identifier).orElse(null)
                : userRepository.findByPhone(identifier).orElse(null);
        if (user == null || user.getRole() != User.Role.WHOLESALER) {
            return ResponseEntity.notFound().build();
        }

        Wholesaler wholesaler = wholesalerRepository.findByUserId(user.getId()).orElse(null);
        if (wholesaler == null) {
            return ResponseEntity.notFound().build();
        }

        RetailerStatementResponseDTO dto = khatabookService.getRetailerStatement(wholesaler.getId(), retailerId);
        return ResponseEntity.ok(dto);
    }

    // ==========================================================
    // WHOLESALER: Retailer credit summary (Profile card)
    // ==========================================================
    @GetMapping("/wholesaler/retailer/{retailerId}/credit-summary")
    public ResponseEntity<?> getRetailerCreditSummary(@PathVariable UUID retailerId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String identifier = auth.getName();

        User user = identifier.contains("@")
                ? userRepository.findByEmail(identifier).orElse(null)
                : userRepository.findByPhone(identifier).orElse(null);
        if (user == null || user.getRole() != User.Role.WHOLESALER) {
            return ResponseEntity.notFound().build();
        }

        Wholesaler wholesaler = wholesalerRepository.findByUserId(user.getId()).orElse(null);
        if (wholesaler == null) {
            return ResponseEntity.notFound().build();
        }

        RetailerCreditSummaryDTO dto = khatabookService.getRetailerCreditSummary(wholesaler.getId(), retailerId);
        return ResponseEntity.ok(dto);
    }

    // ==========================================================
    // WHOLESALER: Retailer outstanding amount (KPI)
    // ==========================================================
    @GetMapping("/wholesaler/retailer/{retailerId}/outstanding")
    public ResponseEntity<?> getOutstandingForRetailer(@PathVariable UUID retailerId) {

        String identifier = SecurityContextHolder.getContext().getAuthentication().getName();

        Wholesaler wholesaler = identifier.contains("@")
                ? wholesalerRepository.findByUserEmail(identifier)
                        .orElseThrow(() -> new RuntimeException("Wholesaler not found"))
                : wholesalerRepository.findByUserPhone(identifier)
                        .orElseThrow(() -> new RuntimeException("Wholesaler not found"));

        Retailer retailer = retailerRepository.findById(retailerId)
                .orElseThrow(() -> new RuntimeException("Retailer not found"));

        java.math.BigDecimal outstanding = ledgerService.getOutstandingForPair(wholesaler, retailer);

        return ResponseEntity.ok(
                Map.of(
                        "retailerId", retailerId.toString(),
                        "outstanding", outstanding));
    }
}
