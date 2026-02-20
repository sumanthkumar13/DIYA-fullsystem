package com.diya.backend.dto.product;

import com.diya.backend.entity.TaxType;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

@Getter @Setter
public class ProductUpdateRequest {
    private String name;
    private String description;
    private String unit;
    private Double price;
    private Double mrp;
    private Integer stock;
    private String imageUrl;
    private UUID categoryId;
    private UUID subcategoryId;
    private Boolean active;               // internal toggle
    private Boolean visibleToRetailer;    // retailer-visible toggle

    // --- Tax & Billing (optional) ---
    private String hsnCode;
    private BigDecimal gstRate;
    private TaxType taxType;
    private String baseUnit;
    private String sellingUnit;
    private Integer unitsPerSelling;
    private Boolean priceIncludesTax;
}
