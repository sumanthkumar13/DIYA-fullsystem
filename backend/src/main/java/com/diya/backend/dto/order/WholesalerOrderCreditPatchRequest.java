package com.diya.backend.dto.order;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class WholesalerOrderCreditPatchRequest {
    private Integer creditDays;
    private BigDecimal approvedCreditAmount;
}
