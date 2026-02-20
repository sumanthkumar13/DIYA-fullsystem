package com.diya.backend.dto.khatabook;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RetailerStatementResponseDTO {
    private UUID retailerId;
    private String retailerName;
    private BigDecimal totalOutstanding;
    private BigDecimal creditLimit;
    private BigDecimal availableCredit;
    private Long overdueDays;
    private List<RetailerLedgerLineDTO> ledger;
}
