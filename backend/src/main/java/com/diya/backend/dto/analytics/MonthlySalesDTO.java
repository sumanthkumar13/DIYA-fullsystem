package com.diya.backend.dto.analytics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MonthlySalesDTO {
    private int year;
    private int month; // 1-12
    private BigDecimal totalRevenue;
    private long totalOrders;
}

