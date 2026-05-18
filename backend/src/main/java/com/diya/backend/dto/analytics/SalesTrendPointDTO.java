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
public class SalesTrendPointDTO {
    /** Human-readable axis label (en-IN). */
    private String label;
    /** Stable key for selection, e.g. 2025-05-16 or 2025-W20 or 2025-05. */
    private String key;
    private int year;
    private int month;
    private int day;
    private BigDecimal revenue;
    private long orderCount;
}
