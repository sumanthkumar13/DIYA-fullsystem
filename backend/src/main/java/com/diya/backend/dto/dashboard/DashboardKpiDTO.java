package com.diya.backend.dto.dashboard;

import lombok.*;

@Getter @Setter @AllArgsConstructor @NoArgsConstructor @Builder
public class DashboardKpiDTO {
    private int newOrdersToday;
    private double paymentsReceivedToday;
    private int pendingOrders;
    private double totalOutstanding;
}
