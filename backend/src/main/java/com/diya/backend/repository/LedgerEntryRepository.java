package com.diya.backend.repository;

import com.diya.backend.entity.LedgerEntry;
import com.diya.backend.entity.Retailer;
import com.diya.backend.entity.Wholesaler;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface LedgerEntryRepository extends JpaRepository<LedgerEntry, UUID> {

    // Wholesaler all entries
    List<LedgerEntry> findByWholesaler(Wholesaler wholesaler);

    // Retailer all entries
    List<LedgerEntry> findByRetailer(Retailer retailer);

    // Pairwise ledger statement (kata book)
    List<LedgerEntry> findByWholesalerAndRetailerOrderByEntryDateDesc(Wholesaler wholesaler, Retailer retailer);

    // Type filters
    List<LedgerEntry> findByWholesalerAndEntryType(Wholesaler wholesaler, LedgerEntry.EntryType entryType);

    List<LedgerEntry> findByRetailerAndEntryType(Retailer retailer, LedgerEntry.EntryType entryType);

    // Pairwise ledger entries (for outstanding calculation)
    List<LedgerEntry> findByWholesalerAndRetailer(Wholesaler wholesaler, Retailer retailer);

    // Pairwise + entryType filter
    List<LedgerEntry> findByWholesalerAndRetailerAndEntryType(
            Wholesaler wholesaler,
            Retailer retailer,
            LedgerEntry.EntryType entryType);
}
