package com.diya.backend.dto;

import lombok.Data;

@Data
public class ProductRequest {
    private String name;
    private String description;
    private Double price;
    private Double mrp;
    private Integer stock;
    private String unit; // e.g. pcs, kg, packet
    private String imageUrl; // optional
    private String categoryId; // optional for now
}
