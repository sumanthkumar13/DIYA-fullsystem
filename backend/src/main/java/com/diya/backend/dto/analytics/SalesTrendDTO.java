package com.diya.backend.dto.analytics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SalesTrendDTO {
    private String granularity;
    private List<SalesTrendPointDTO> points;
    private BigDecimal totalRevenue;
    /** Revenue in the comparison window immediately before the chart range (for growth badge). */
    private BigDecimal comparisonRevenue;
}
