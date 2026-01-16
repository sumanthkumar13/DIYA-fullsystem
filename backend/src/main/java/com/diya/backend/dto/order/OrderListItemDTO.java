package com.diya.backend.dto.order;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderListItemDTO {
    private String id;         // orderNumber
    private String retailer;   // retailer.user.name
    private String location;   // "City, State" or address
    private double amount;     // totalAmount
    private String date;       // ISO datetime string
    private String status;     // Order.Status name
    private int items;         // count of order items
    private String exposure;   // placeholder: NORMAL / WARNING / CRITICAL
}
