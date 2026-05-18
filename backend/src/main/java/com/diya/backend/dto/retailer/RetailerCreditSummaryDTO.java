package com.diya.backend.dto.retailer;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Credit summary for a retailer (wholesaler scope).
 * Outstanding amounts and credit-given are derived from orders and confirmed payments mapped to those orders.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RetailerCreditSummaryDTO {
    private UUID retailerId;
    private String retailerName;
    /**
     * Total unpaid amount across accepted orders for this retailer:
     * \(\sum(\text{order.totalAmount} - \text{confirmedPaid})\), excluding PLACED/REJECTED/CANCELLED.
     *
     * Note: this includes both not-yet-due and overdue unpaid amounts.
     */
    private BigDecimal totalOutstanding;
    /** Portion of unpaid that is NOT overdue (accepted orders only). */
    private BigDecimal outstandingAmount;
    /** Portion of unpaid that IS overdue (accepted orders only). */
    private BigDecimal overdueAmount;
    /**
     * Current unpaid amount summed only over accepted orders that were extended on credit (approved credit portion
     * or legacy CREDIT mode). Confirmed payments reduce this via the same per-order unpaid balance as
     * {@link #totalOutstanding}. Does not include purely cash/UPI orders with no approved credit.
     */
    private BigDecimal creditGiven;
    private BigDecimal creditLimit;
    private BigDecimal availableCredit;
    private int overdueDays;
    private LocalDateTime lastPaymentDate;
    private LocalDateTime lastOrderDate;

    /** Profile / owner display (from retailer + linked user). */
    private String shopName;
    private String phoneContact;
    private String address;
    /** Retailer region (canonical territory). */
    private String region;
    private String city;
    private String state;
    private String proprietorName;

    /** Sum of order totals for DELIVERED/COMPLETED/INVOICED orders (tier calculation). */
    private BigDecimal totalCompletedPurchaseValue;
    /** BEGINNER, BRONZE, SILVER, GOLD, DIAMOND */
    private String tier;

    /** APPROVED | BLOCKED | REMOVED — wholesaler–retailer connection lifecycle */
    private String connectionStatus;
}
