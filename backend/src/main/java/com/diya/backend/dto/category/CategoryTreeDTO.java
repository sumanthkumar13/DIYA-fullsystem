package com.diya.backend.dto.category;

import lombok.*;
import java.util.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CategoryTreeDTO {
    private UUID id;
    private String name;

    @Builder.Default
    private List<SubNode> subcategories = new ArrayList<>();

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SubNode {
        private UUID id;
        private String name;
    }
}
