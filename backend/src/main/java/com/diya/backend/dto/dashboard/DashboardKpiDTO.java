package com.diya.backend.dto.dashboard;

import lombok.*;

import java.math.BigDecimal;

@Getter @Setter @AllArgsConstructor @NoArgsConstructor @Builder
public class DashboardKpiDTO {
    private int newOrdersToday;
    private int newOrdersYesterday;
    private BigDecimal paymentsReceivedToday;
    private BigDecimal paymentsReceivedYesterday;
    private int pendingOrders;
    private int pendingOrdersYesterday;
    /**
     * Sum of {@link com.diya.backend.entity.Order#getTotalAmount()} for orders accepted on the given calendar day
     * (server local date) that are still in post-acceptance active statuses. Excludes PLACED / REJECTED / CANCELLED.
     */
    private BigDecimal salesToday;
    private BigDecimal salesYesterday;
}
