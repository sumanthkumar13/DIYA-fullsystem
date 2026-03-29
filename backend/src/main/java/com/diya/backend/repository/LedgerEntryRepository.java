package com.diya.backend.repository;

import com.diya.backend.entity.LedgerEntry;
import com.diya.backend.entity.Retailer;
import com.diya.backend.entity.Wholesaler;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
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

    @Query("""
            select coalesce(sum(
              case
                when e.entryType = com.diya.backend.entity.LedgerEntry.EntryType.DEBIT then e.amount
                else -e.amount
              end
            ), 0)
            from LedgerEntry e
            where e.wholesaler = :wholesaler
            """)
    BigDecimal outstandingForWholesaler(@Param("wholesaler") Wholesaler wholesaler);

    @Query("""
            select
              e.retailer.id,
              coalesce(e.retailer.shopName, coalesce(e.retailer.user.name, 'Unknown')),
              coalesce(sum(
                case
                  when e.entryType = com.diya.backend.entity.LedgerEntry.EntryType.DEBIT then e.amount
                  else -e.amount
                end
              ), 0)
            from LedgerEntry e
            where e.wholesaler = :wholesaler
            group by e.retailer.id, e.retailer.shopName, e.retailer.user.name
            having coalesce(sum(
                case
                  when e.entryType = com.diya.backend.entity.LedgerEntry.EntryType.DEBIT then e.amount
                  else -e.amount
                end
              ), 0) > 0
            order by coalesce(sum(
                case
                  when e.entryType = com.diya.backend.entity.LedgerEntry.EntryType.DEBIT then e.amount
                  else -e.amount
                end
              ), 0) desc
            """)
    List<Object[]> retailersWithOutstandingForWholesaler(@Param("wholesaler") Wholesaler wholesaler);

    @Query("""
            select
              e.retailer.id,
              max(e.entryDate)
            from LedgerEntry e
            where e.wholesaler = :wholesaler
              and e.entryType = com.diya.backend.entity.LedgerEntry.EntryType.CREDIT
            group by e.retailer.id
            """)
    List<Object[]> lastPaymentAtByRetailerForWholesaler(@Param("wholesaler") Wholesaler wholesaler);
}
