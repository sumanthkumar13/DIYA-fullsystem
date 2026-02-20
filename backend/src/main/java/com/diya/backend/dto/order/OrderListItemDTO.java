package com.diya.backend.dto.order;

import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderListItemDTO {
    private String id;         // UUID string (internal)
    private String orderNumber; // Human-friendly order number (display)
    private String retailer;   // retailer.user.name
    private String location;   // "City, State" or address
    private BigDecimal amount; // totalAmount
    private String date;       // ISO datetime string
    private String status;     // Order.Status name
    private int items;         // count of order items
    private String exposure;   // placeholder: NORMAL / WARNING / CRITICAL
}
