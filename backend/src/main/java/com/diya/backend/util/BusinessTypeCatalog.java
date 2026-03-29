package com.diya.backend.util;

import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

public final class BusinessTypeCatalog {

    public static final List<String> CANONICAL_TYPES = List.of(
            "Kirana Store",
            "Supermarket",
            "Medical Shop",
            "Electronics",
            "Clothing / Garments",
            "Hardware",
            "Restaurant / Hotel",
            "General Store",
            "Others");

    private static final Set<String> ALLOWED = Collections.unmodifiableSet(new LinkedHashSet<>(CANONICAL_TYPES));

    private BusinessTypeCatalog() {
    }

    public static void requireValidBusinessType(String businessType) {
        if (businessType == null || businessType.isBlank()) {
            throw new RuntimeException("Business type is required");
        }
        String trimmed = businessType.trim();
        if (!ALLOWED.contains(trimmed)) {
            throw new RuntimeException("Invalid business type.");
        }
    }

    public static boolean isAllowed(String businessType) {
        return businessType != null && ALLOWED.contains(businessType.trim());
    }
}
