package com.diya.backend.dto.analytics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SlowMovingProductDTO {
    private UUID productId;
    private String productName;
    private Integer currentStock;
    private LocalDateTime lastSoldAt;
}

