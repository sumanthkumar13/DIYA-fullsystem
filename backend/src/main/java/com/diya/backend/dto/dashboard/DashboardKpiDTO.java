package com.diya.backend.dto.dashboard;

import lombok.*;

import java.math.BigDecimal;

@Getter @Setter @AllArgsConstructor @NoArgsConstructor @Builder
public class DashboardKpiDTO {
    private int newOrdersToday;
    private BigDecimal paymentsReceivedToday;
    private int pendingOrders;
    private BigDecimal totalOutstanding;
}
