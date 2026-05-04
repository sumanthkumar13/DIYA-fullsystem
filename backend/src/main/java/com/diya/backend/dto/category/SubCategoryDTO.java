package com.diya.backend.dto.category;

import java.util.UUID;

public record SubCategoryDTO(
        UUID id,
        String name,
        String imageUrl,
        UUID categoryId,
        UUID parentSubId) {
}
