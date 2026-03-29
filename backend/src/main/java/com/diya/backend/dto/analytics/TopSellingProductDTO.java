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
public class TopSellingProductDTO {
    private UUID productId;
    private String productName;
    private long totalQuantitySold;
    private BigDecimal totalRevenue;
}

