package com.diya.backend.dto.khatabook;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RecordPaymentRequest {
    private UUID retailerId;
    private BigDecimal amount;
    private String mode;
    private String note;
}
