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
public class TopRetailerDTO {
    private UUID retailerId;
    private String retailerName;
    private long totalOrders;
    private BigDecimal totalRevenue;
}

