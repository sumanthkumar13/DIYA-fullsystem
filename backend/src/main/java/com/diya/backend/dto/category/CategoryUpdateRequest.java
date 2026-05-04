package com.diya.backend.dto.category;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CategoryUpdateRequest {
    private String name;
    private String imageUrl;
}

