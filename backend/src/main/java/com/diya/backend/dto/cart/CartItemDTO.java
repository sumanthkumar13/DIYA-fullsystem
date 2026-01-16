package com.diya.backend.dto.cart;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class CartItemDTO {
    private UUID id;
    private UUID productId;
    private String productName;
    private String productSku;
    private String productImageUrl;
    private Integer quantity;
    private Double price;
    private Double mrp;
    private Double total;
    private String status; // In Stock, Low Stock, Out of Stock
}
