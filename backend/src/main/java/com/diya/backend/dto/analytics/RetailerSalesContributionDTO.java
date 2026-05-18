package com.diya.backend.dto.analytics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RetailerSalesContributionDTO {
    private UUID retailerId;
    private String shopName;
    private BigDecimal amount;
    /** Share of month total, 0–100. */
    private double percentage;
}
