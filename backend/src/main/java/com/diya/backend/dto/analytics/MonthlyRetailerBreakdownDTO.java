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
public class MonthlyRetailerBreakdownDTO {
    private int year;
    private int month;
    private String monthLabel;
    private BigDecimal monthTotal;
    private List<RetailerSalesContributionDTO> content;
    private int page;
    private int size;
    private long totalElements;
    private int totalPages;
}
