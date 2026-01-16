package com.diya.backend.dto.category;

import lombok.Getter;
import lombok.Setter;
import java.util.UUID;

@Getter
@Setter
public class SubCategoryCreateRequest {
    private UUID categoryId;
    private String name;
    private UUID parentSubId; // nullable

}
