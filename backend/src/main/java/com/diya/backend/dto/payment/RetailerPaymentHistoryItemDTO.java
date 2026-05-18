package com.diya.backend.dto.payment;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Stable retailer-facing payment history item (no JPA graph / Jackson identity refs).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RetailerPaymentHistoryItemDTO {
    private UUID id;
    private BigDecimal amount;
    private String mode;
    private String status;
    private String reference;
    private String note;
    private LocalDateTime createdAt;
    private LocalDateTime confirmedAt;
    private LocalDateTime rejectedAt;

    /** Order this payment applies to (never null for order-scoped payments). */
    private UUID orderId;
    private String orderNumber;

    /**
     * IMMEDIATE = wholesaler-recorded at order acceptance;
     * RETAILER = retailer-recorded (typically pending verification).
     */
    private String source;
}
