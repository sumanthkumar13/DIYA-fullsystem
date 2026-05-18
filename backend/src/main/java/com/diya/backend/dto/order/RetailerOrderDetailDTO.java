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
public class RetailerOrderDetailDTO {
    private UUID id;
    private String orderNumber;
    private String status;
    private String paymentStatus;
    private String paymentMode;
    private Integer creditDays;
    private LocalDateTime dueDate;
    private Boolean isOverdue;
    /** Sum of CONFIRMED payments for this order. */
    private BigDecimal paidAmount;
    /** Remaining due (total − paid); zero when order is PLACED / REJECTED / CANCELLED. */
    private BigDecimal outstandingAmount;
    private LocalDateTime placedAt;
    private LocalDateTime editedAt;
    private String editReason;

    private BigDecimal subtotal;
    private BigDecimal taxAmount;
    private BigDecimal deliveryCharge;
    private BigDecimal totalAmount;

    private WholesalerDTO wholesaler;
    private List<OrderItemDTO> orderItems;
    private List<PaymentHistoryDTO> paymentHistory;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PaymentHistoryDTO {
        private BigDecimal amount;
        private String paymentMethod;
        private String status;
        private LocalDateTime createdAt;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class WholesalerDTO {
        private UUID id;
        private String businessName;
        private String city;
        private String state;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class OrderItemDTO {
        private UUID id;
        private String productNameSnapshot;
        private Integer qty;
        private BigDecimal unitPriceSnapshot;
        private BigDecimal lineTotal;
        private Integer originalQty;
        private BigDecimal originalUnitPrice;
        private BigDecimal originalLineTotal;
    }
}
