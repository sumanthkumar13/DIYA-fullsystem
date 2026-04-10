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
    /**
     * Credit days for any credit exposure created on acceptance.
     *
     * - If paymentMode == CREDIT: required (full order becomes credit).
     * - If paymentMode == CASH/UPI: required only when paidNow < orderTotal (remaining becomes credit).
     */
    private Integer creditDays;

    /**
     * Amount received immediately at acceptance for CASH/UPI flows.
     * When omitted for CASH/UPI, backend will assume full payment (backward-compatible).
     */
    private BigDecimal paidNow;
}

