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
    private String retailerId; // UUID string
    private String retailer;   // retailer.user.name
    private String location;   // "City, State" or address
    private BigDecimal amount; // totalAmount
    private String date;       // ISO datetime string
    private String createdAt;  // ISO datetime string (alias of placedAt for sorting)
    private String status;     // Order.Status name
    private int items;         // count of order items
    private String exposure;   // placeholder: NORMAL / WARNING / CRITICAL
    private String dueDate;    // ISO datetime string (nullable)
    private BigDecimal unpaidAmount; // based on CONFIRMED payments
}
