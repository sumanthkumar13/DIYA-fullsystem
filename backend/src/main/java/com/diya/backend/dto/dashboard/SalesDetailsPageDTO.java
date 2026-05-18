package com.diya.backend.dto.dashboard;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SalesDetailsPageDTO {
    /** Sum of accepted-order totals in the selected sales window. */
    private BigDecimal dayTotalSales;
    /** Start date of the primary window (for clients / legacy). */
    private SalesDayDTO day;
    /** Same as request: TODAY, YESTERDAY, THIS_WEEK, THIS_MONTH. */
    private String period;
    /** Human-readable window, e.g. "1–15 May 2026". */
    private String rangeLabel;

    private List<SalesRetailerRowDTO> content;
    private int page;
    private int size;
    private long totalElements;
    private int totalPages;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SalesDayDTO {
        private int year;
        private int month;
        private int day;
    }
}
