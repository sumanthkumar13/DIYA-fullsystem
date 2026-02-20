package com.diya.backend.dto.order;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WholesalerOrderItemDetailDTO {
    private String orderItemId;
    private String productNameSnapshot;
    private Integer orderedQty;
    private String unitSnapshot;
    private Double unitPriceSnapshot;
    private Double lineTotal;

    private Integer currentStock;
    private Integer currentReservedStock;
    private Integer availableStock;
}

