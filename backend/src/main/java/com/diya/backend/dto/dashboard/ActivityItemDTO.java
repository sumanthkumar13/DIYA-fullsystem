package com.diya.backend.dto.dashboard;

import lombok.*;

@Getter @Setter @AllArgsConstructor @NoArgsConstructor @Builder
public class ActivityItemDTO {
    private String type;      // ORDER, PAYMENT, OVERDUE, RETAILER
    private String title;
    private String subtitle;
    private String timeAgo;
}
