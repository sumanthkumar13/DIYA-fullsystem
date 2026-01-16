package com.diya.backend.dto.product;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

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
}
