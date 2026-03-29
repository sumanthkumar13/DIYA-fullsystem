package com.diya.backend.dto.analytics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderStatusSummaryDTO {
    private long pendingOrders;
    private long dispatchedOrders;
    private long deliveredOrders;
}

