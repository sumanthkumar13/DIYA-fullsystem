package com.diya.backend.dto.dashboard;

import lombok.*;

@Getter @Setter @AllArgsConstructor @NoArgsConstructor @Builder
public class TerritoryDTO {
    private AreaDTO topArea;
    private AreaDTO highestRiskArea;

    private int activeRetailers;
    private int totalRetailers;
}
