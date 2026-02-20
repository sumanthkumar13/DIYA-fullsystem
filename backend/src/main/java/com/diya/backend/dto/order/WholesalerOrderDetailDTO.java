package com.diya.backend.dto.order;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WholesalerOrderDetailDTO {
    private UUID id;
    private String orderNumber;
    private String status;
    private String paymentStatus;
    private String paymentMode;
    private Integer creditDays;
    private LocalDateTime dueDate;
    private Boolean isOverdue;
    private BigDecimal outstandingAmount;
    private LocalDateTime placedAt;

    private BigDecimal subtotal;
    private BigDecimal taxAmount;
    private BigDecimal deliveryCharge;
    private BigDecimal totalAmount;

    private RetailerDTO retailer;
    private List<WholesalerOrderItemDetailDTO> items;

    /** Set when order status is INVOICED; used for "View Invoice" link. */
    private UUID invoiceId;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RetailerDTO {
        private UUID id;
        private String name;
        private String shopName;
        private String phone;
        private String address;
        private String city;
        private String state;
    }
}

