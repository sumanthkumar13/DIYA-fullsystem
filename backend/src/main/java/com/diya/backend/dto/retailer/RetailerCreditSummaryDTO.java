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
 * Outstanding and credit-given are derived from orders + confirmed payments.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RetailerCreditSummaryDTO {
    private UUID retailerId;
    private String retailerName;
    /** Sum of (order total − confirmed payments) for non-cancelled/rejected orders. */
    private BigDecimal totalOutstanding;
    /** Sum of order totals for CREDIT orders that are accepted (not PLACED/CANCELLED/REJECTED). */
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
    private String city;
    private String state;
    private String proprietorName;

    /** Sum of order totals for DELIVERED/COMPLETED/INVOICED orders (tier calculation). */
    private BigDecimal totalCompletedPurchaseValue;
    /** BEGINNER, BRONZE, SILVER, GOLD, DIAMOND */
    private String tier;
}
