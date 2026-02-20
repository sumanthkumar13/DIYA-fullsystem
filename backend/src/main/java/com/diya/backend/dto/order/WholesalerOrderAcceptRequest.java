package com.diya.backend.dto.order;

import com.diya.backend.entity.Order;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WholesalerOrderAcceptRequest {
    private Order.PaymentMode paymentMode; // CASH / UPI / CREDIT
    private Integer creditDays; // required when paymentMode == CREDIT
    /** Amount of credit the wholesaler is granting for this order. Defaults to order total if null; capped to order total. */
    private BigDecimal approvedCreditAmount;
}

