package com.diya.backend.dto.analytics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RetailerPendingPaymentDTO {
    private UUID retailerId;
    private String retailerName;
    private BigDecimal outstandingAmount;
    private LocalDateTime lastPaymentAt;
}

