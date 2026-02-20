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
public class RetailerCreditOverviewDTO {
    private UUID retailerId;
    private String retailerName;
    private String shopName;
    private BigDecimal outstanding;
    private int overdueDays;
    private LocalDateTime lastPaymentDate;
}
