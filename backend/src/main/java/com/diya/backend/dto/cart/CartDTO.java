package com.diya.backend.dto.cart;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
@Builder
public class CartDTO {
    private UUID id;
    private UUID wholesalerId;
    private String wholesalerName;
    private List<CartItemDTO> items;
    private Double totalAmount;
    private Integer totalItems;
}
