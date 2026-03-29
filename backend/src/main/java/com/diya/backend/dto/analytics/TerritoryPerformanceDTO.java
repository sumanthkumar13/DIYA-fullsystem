package com.diya.backend.dto.analytics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TerritoryPerformanceDTO {
    private String region;
    private BigDecimal revenue;
    private BigDecimal outstanding;
    private BigDecimal overdue;
    private int activeRetailers;
    private int totalRetailers;
    /** GOLD, SILVER, or RISK */
    private String status;
}
