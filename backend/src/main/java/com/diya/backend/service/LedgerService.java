package com.diya.backend.service;

import com.diya.backend.entity.LedgerEntry;
import com.diya.backend.entity.Retailer;
import com.diya.backend.entity.Wholesaler;
import com.diya.backend.repository.LedgerEntryRepository;
import com.diya.backend.repository.RetailerRepository;
import com.diya.backend.repository.WholesalerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class LedgerService {

    private final LedgerEntryRepository ledgerEntryRepository;
    private final WholesalerRepository wholesalerRepository;
    private final RetailerRepository retailerRepository;

    // ==========================================================
    // WHOLESALER Ledger Entries
    // ==========================================================
    public List<LedgerEntry> getWholesalerLedger(String identifier, LocalDate from, LocalDate to, String type) {

        Wholesaler wholesaler = identifier.contains("@")
                ? wholesalerRepository.findByUserEmail(identifier)
                        .orElseThrow(() -> new RuntimeException("Wholesaler not found"))
                : wholesalerRepository.findByUserPhone(identifier)
                        .orElseThrow(() -> new RuntimeException("Wholesaler not found"));

        List<LedgerEntry> entries;

        // DB filter by type first
        if (type != null && !type.isBlank()) {
            LedgerEntry.EntryType entryType = LedgerEntry.EntryType.valueOf(type.toUpperCase());
            entries = ledgerEntryRepository.findByWholesalerAndEntryType(wholesaler, entryType);
        } else {
            entries = ledgerEntryRepository.findByWholesaler(wholesaler);
        }

        // Date range filter in memory (OK for now)
        if (from != null) {
            entries = entries.stream()
                    .filter(e -> !e.getEntryDate().toLocalDate().isBefore(from))
                    .toList();
        }
        if (to != null) {
            entries = entries.stream()
                    .filter(e -> !e.getEntryDate().toLocalDate().isAfter(to))
                    .toList();
        }

        return entries;
    }

    // ==========================================================
    // RETAILER Ledger Entries
    // ==========================================================
    public List<LedgerEntry> getRetailerLedger(String identifier, LocalDate from, LocalDate to, String type) {

        Retailer retailer = identifier.contains("@")
                ? retailerRepository.findByUserEmail(identifier)
                        .orElseThrow(() -> new RuntimeException("Retailer not found"))
                : retailerRepository.findByUserPhone(identifier)
                        .orElseThrow(() -> new RuntimeException("Retailer not found"));

        List<LedgerEntry> entries;

        // DB filter by type first
        if (type != null && !type.isBlank()) {
            LedgerEntry.EntryType entryType = LedgerEntry.EntryType.valueOf(type.toUpperCase());
            entries = ledgerEntryRepository.findByRetailerAndEntryType(retailer, entryType);
        } else {
            entries = ledgerEntryRepository.findByRetailer(retailer);
        }

        // Date range filter in memory (OK for now)
        if (from != null) {
            entries = entries.stream()
                    .filter(e -> !e.getEntryDate().toLocalDate().isBefore(from))
                    .toList();
        }
        if (to != null) {
            entries = entries.stream()
                    .filter(e -> !e.getEntryDate().toLocalDate().isAfter(to))
                    .toList();
        }

        return entries;
    }

    // ==========================================================
    // Outstanding calculation (core Kata Book logic)
    // Outstanding = SUM(DEBIT) - SUM(CREDIT)
    // ==========================================================
    public BigDecimal getOutstandingForPair(Wholesaler wholesaler, Retailer retailer) {

        List<LedgerEntry> entries = ledgerEntryRepository.findByWholesalerAndRetailer(wholesaler, retailer);

        BigDecimal totalDebit = entries.stream()
                .filter(e -> e.getEntryType() == LedgerEntry.EntryType.DEBIT)
                .map(LedgerEntry::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalCredit = entries.stream()
                .filter(e -> e.getEntryType() == LedgerEntry.EntryType.CREDIT)
                .map(LedgerEntry::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        // ORDER_PAYMENT_INFO excluded by filters above

        BigDecimal outstanding = totalDebit.subtract(totalCredit);
        if (outstanding == null) {
            return BigDecimal.ZERO;
        }
        // Outstanding should never be negative; excess credits are treated as advance (not shown as negative).
        return outstanding.max(BigDecimal.ZERO);
    }

    public List<LedgerEntry> getStatementForPair(Wholesaler wholesaler, Retailer retailer) {
        return ledgerEntryRepository.findByWholesalerAndRetailerOrderByEntryDateDesc(wholesaler, retailer);
    }

}
