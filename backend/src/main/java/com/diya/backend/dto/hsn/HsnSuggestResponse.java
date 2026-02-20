package com.diya.backend.dto.hsn;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HsnSuggestResponse {

    private String hsnCode;
    private BigDecimal gstRate;
    private String description;
    private String confidence;  // HIGH, MEDIUM, LOW
    private String matchedKeyword;
}
