package com.diya.backend.dto.product;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductRetailerVisibilityRowDTO {
    private UUID retailerId;
    private String name;
    /** false if product is hidden from this retailer */
    private boolean visible;
}
