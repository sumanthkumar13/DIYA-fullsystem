package com.diya.backend.dto.cart;

import lombok.Data;

import java.util.UUID;

@Data
public class UpdateCartRequest {
    private UUID productId;
    private Integer quantity;
}
