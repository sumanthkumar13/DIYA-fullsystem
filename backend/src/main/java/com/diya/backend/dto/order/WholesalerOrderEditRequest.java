package com.diya.backend.dto.order;

import lombok.*;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WholesalerOrderEditRequest {
    private String reason;
    private List<ItemEdit> items;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ItemEdit {
        private UUID orderItemId;
        private Integer newQty;
        private Double newUnitPrice;
    }
}

