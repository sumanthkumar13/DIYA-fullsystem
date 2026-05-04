package com.diya.backend.dto.khatabook;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RetailerLedgerLineDTO {
    private LocalDateTime date;
    private String description;
    private String type;
    private BigDecimal amount;
    private BigDecimal runningBalance;
    private UUID orderId;
    private String orderNumber;
    private LocalDateTime orderDate;
    private String paymentMethod;
    private LocalDateTime paymentDate;
    /** True when line is audit-only (e.g. cash at order acceptance); running balance unchanged for this row. */
    private Boolean informational;
}
