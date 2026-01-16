package com.diya.backend.dto.product;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class ProductDetailDTO {
    private UUID id;
    private String sku;
    private String name;
    private String description;
    private String unit;
    private Double price;
    private Double mrp;
    private Integer stock;
    private String status;
    private String imageUrl;

    private UUID categoryId;
    private String categoryName;

    private UUID subcategoryId;
    private String subcategoryName;

    private boolean visibleToRetailer;

    private String wholesalerName;
    private String wholesalerCity;
}
