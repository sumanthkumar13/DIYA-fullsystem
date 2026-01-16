package com.diya.backend.dto.category;

import java.util.UUID;

public record SubCategoryDTO(
        UUID id,
        String name,
        UUID categoryId,
        UUID parentSubId) {
}
