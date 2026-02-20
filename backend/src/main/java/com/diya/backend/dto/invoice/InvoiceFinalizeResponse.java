package com.diya.backend.dto.invoice;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InvoiceFinalizeResponse {

    private UUID invoiceId;
    private String invoiceNumber;
    private BigDecimal grandTotal;
}
