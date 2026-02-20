package com.diya.backend.dto.retailer;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RetailerCreditSummaryDTO {
    private UUID retailerId;
    private String retailerName;
    private BigDecimal totalOutstanding;
    private int overdueDays;
    private LocalDateTime lastPaymentDate;
    private LocalDateTime lastOrderDate;
    private BigDecimal creditLimit;
    private BigDecimal availableCredit;
}
