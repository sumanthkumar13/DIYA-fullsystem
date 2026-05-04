package com.diya.backend.util;

import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

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

    /**
     * Retailer self-signup uses pincode → PostOffice name as the stored "region" (territory label).
     * It is intentionally NOT limited to {@link #CANONICAL_REGIONS}.
     */
    private static final int RETAILER_REGION_MIN_LEN = 2;
    private static final int RETAILER_REGION_MAX_LEN = 120;
    private static final Pattern RETAILER_REGION_PATTERN = Pattern.compile(
            "^[\\p{L}0-9][\\p{L}0-9\\s.,'&()\\-/]*$");

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

    /**
     * Validates retailer territory label (e.g. India Post PostOffice / district-style name).
     */
    public static String requireValidRetailerRegion(String region) {
        if (region == null || region.isBlank()) {
            throw new RuntimeException("Region is required");
        }
        String trimmed = region.trim();
        if (trimmed.length() < RETAILER_REGION_MIN_LEN || trimmed.length() > RETAILER_REGION_MAX_LEN) {
            throw new RuntimeException("Invalid region. Please select a valid location.");
        }
        if (!RETAILER_REGION_PATTERN.matcher(trimmed).matches()) {
            throw new RuntimeException("Invalid region. Please select a valid location.");
        }
        return trimmed;
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
