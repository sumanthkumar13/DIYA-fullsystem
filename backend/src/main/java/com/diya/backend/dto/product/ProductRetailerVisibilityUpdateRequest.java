package com.diya.backend.dto.product;

import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
public class ProductRetailerVisibilityUpdateRequest {
    /** Retailers who must NOT see this product */
    private List<UUID> hiddenRetailerIds;
}
