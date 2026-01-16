package com.diya.backend.dto.product;

import lombok.Getter;
import lombok.Setter;
import java.util.UUID;

@Getter @Setter
public class ProductCreateRequest {
    private String name;
    private String description;
    private String unit;
    private Double price;
    private Double mrp;
    private Integer stock;
    private String imageUrl;
    private UUID categoryId;
    private UUID subcategoryId;
    // visibleToRetailer optional - default true
    private Boolean visibleToRetailer;
}
