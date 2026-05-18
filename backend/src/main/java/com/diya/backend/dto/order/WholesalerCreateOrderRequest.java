package com.diya.backend.dto.order;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WholesalerCreateOrderRequest {

    private UUID retailerId;
    private List<Item> items;
    private String notes;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Item {
        private UUID productId;
        /**
         * Use Long to avoid JSON int parsing failures for large inputs.
         * Validated and bounded in service before use.
         */
        private Long quantity;
    }
}

