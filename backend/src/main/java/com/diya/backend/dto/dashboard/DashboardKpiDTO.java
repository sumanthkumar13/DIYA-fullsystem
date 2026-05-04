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
    private BigDecimal totalOutstanding;
    private BigDecimal totalOutstandingYesterday;
}
