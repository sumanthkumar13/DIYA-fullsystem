package com.diya.backend.dto.dashboard;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KpiWidgetDTO {
    private String metric;
    private String period;
    private BigDecimal value;
    private BigDecimal comparisonValue;
}
