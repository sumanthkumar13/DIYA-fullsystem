package com.diya.backend.dto.product;

import com.diya.backend.entity.TaxType;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

@Getter @Setter
@Builder
public class ProductResponseDTO {
    private UUID id;
    private String sku;
    private Integer sequenceNumber;
    private String name;
    private String description;
    private String unit;
    private Double price;
    private Double mrp;
    private Integer stock;
    private String status; // "In Stock" | "Low Stock" | "Out of Stock"
    private String imageUrl;
    private UUID categoryId;
    private String categoryName;
    private UUID subcategoryId;
    private String subcategoryName;
    private Boolean isActive;             // maps from entity.active
    private Boolean visibleToRetailer;
    private String hsnCode;
    private BigDecimal gstRate;
    private TaxType taxType;
    private String baseUnit;
    private String sellingUnit;
    private Integer unitsPerSelling;
    private Boolean priceIncludesTax;
}
