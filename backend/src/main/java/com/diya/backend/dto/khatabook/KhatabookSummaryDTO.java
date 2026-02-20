package com.diya.backend.dto.khatabook;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class KhatabookSummaryDTO {
    private BigDecimal totalOutstanding;
    private BigDecimal criticalOverdue;
    private BigDecimal collectedThisMonth;
    private Long retailerCount;
}
