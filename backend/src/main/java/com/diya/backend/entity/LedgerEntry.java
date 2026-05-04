package com.diya.backend.entity;

import com.fasterxml.jackson.annotation.JsonIdentityInfo;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.ObjectIdGenerators;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@JsonIdentityInfo(generator = ObjectIdGenerators.PropertyGenerator.class, property = "id")
@JsonIgnoreProperties({ "hibernateLazyInitializer", "handler" })
@Entity
@Table(name = "ledger_entries")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LedgerEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "wholesaler_id", nullable = false)
    private Wholesaler wholesaler;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "retailer_id", nullable = false)
    private Retailer retailer;

    // Optional link to related order (can be null for manual ledger adjustments)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "related_order_id")
    private Order relatedOrder;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EntryType entryType;

    @Column(precision = 19, scale = 2, nullable = false)
    private BigDecimal amount;

    @Column(length = 500)
    private String description;

    @Builder.Default
    @Column(nullable = false)
    private LocalDateTime entryDate = LocalDateTime.now();

    /**
     * Ledger line classification (retailer–wholesaler outstanding):
     * <ul>
     *   <li>DEBIT — credit extended (increases amount owed; "CREDIT_ENTRY" in product terms)</li>
     *   <li>CREDIT — payment received against that credit (decreases amount owed; "PAYMENT_ENTRY")</li>
     *   <li>ORDER_PAYMENT_INFO — cash/UPI collected at order acceptance; informational only, does not change balance</li>
     * </ul>
     */
    public enum EntryType {
        DEBIT,
        CREDIT,
        /** Cash/UPI at order acceptance — display/audit only; must not affect outstanding. */
        ORDER_PAYMENT_INFO
    }
}
