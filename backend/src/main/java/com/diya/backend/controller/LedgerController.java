package com.diya.backend.controller;

import com.diya.backend.entity.LedgerEntry;
import com.diya.backend.entity.Retailer;
import com.diya.backend.entity.Wholesaler;
import com.diya.backend.repository.RetailerRepository;
import com.diya.backend.repository.WholesalerRepository;
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
    private final WholesalerRepository wholesalerRepository;
    private final RetailerRepository retailerRepository;

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
    // WHOLESALER: Retailer statement (kata book)
    // ==========================================================
    @GetMapping("/wholesaler/retailer/{retailerId}/statement")
    public ResponseEntity<List<LedgerEntry>> getRetailerStatementForWholesaler(
            @PathVariable UUID retailerId) {
        String identifier = SecurityContextHolder.getContext().getAuthentication().getName();

        Wholesaler wholesaler = identifier.contains("@")
                ? wholesalerRepository.findByUserEmail(identifier)
                        .orElseThrow(() -> new RuntimeException("Wholesaler not found"))
                : wholesalerRepository.findByUserPhone(identifier)
                        .orElseThrow(() -> new RuntimeException("Wholesaler not found"));

        Retailer retailer = retailerRepository.findById(retailerId)
                .orElseThrow(() -> new RuntimeException("Retailer not found"));

        // This will show statement latest first (use repository method)
        return ResponseEntity.ok(
                ledgerService.getStatementForPair(wholesaler, retailer));
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

        double outstanding = ledgerService.getOutstandingForPair(wholesaler, retailer);

        return ResponseEntity.ok(
                Map.of(
                        "retailerId", retailerId.toString(),
                        "outstanding", outstanding));
    }
}
