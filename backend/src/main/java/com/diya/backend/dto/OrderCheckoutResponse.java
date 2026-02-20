package com.diya.backend.dto;

import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderCheckoutResponse {
    private UUID orderId;
    private String orderNumber;
    private BigDecimal totalAmount;
    private String message;
}
