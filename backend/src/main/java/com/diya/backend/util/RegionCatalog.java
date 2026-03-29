package com.diya.backend.util;

import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Canonical regions for wholesaler signup, retailer assignment, and territory analytics.
 */
public final class RegionCatalog {

    public static final List<String> CANONICAL_REGIONS = List.of(
            "Banjara Hills",
            "Jubilee Hills",
            "Madhapur",
            "Kukatpally",
            "Old City",
            "Gachibowli");

    private static final Set<String> ALLOWED = Collections.unmodifiableSet(new LinkedHashSet<>(CANONICAL_REGIONS));

    private RegionCatalog() {
    }

    public static void requireValidRegion(String region) {
        if (region == null || region.isBlank()) {
            throw new RuntimeException("Region is required");
        }
        String trimmed = region.trim();
        if (!ALLOWED.contains(trimmed)) {
            throw new RuntimeException("Invalid region. Choose one of the predefined regions.");
        }
    }

    public static boolean isAllowed(String region) {
        return region != null && ALLOWED.contains(region.trim());
    }

    public static String normalize(String region) {
        if (region == null || region.isBlank()) {
            return "";
        }
        return region.trim();
    }
}
