package com.diya.backend.dto.invoice;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InvoicePreviewDTO {

    private String invoiceNumber;
    private LocalDateTime invoiceDate;
    private String retailerName;

    private List<InvoicePreviewItemDTO> items;

    private BigDecimal totalTaxable;
    private BigDecimal totalCgst;
    private BigDecimal totalSgst;
    private BigDecimal grandTotal;

    /** Whether this invoice has been exported to Tally. */
    private Boolean tallyExported;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InvoicePreviewItemDTO {
        private String productName;
        private String hsnCode;
        private BigDecimal quantitySellingUnit;
        private String sellingUnit;
        private BigDecimal rate;
        private BigDecimal taxableValue;
        private BigDecimal cgst;
        private BigDecimal sgst;
        private BigDecimal lineTotal;
    }
}
