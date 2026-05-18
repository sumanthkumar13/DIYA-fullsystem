package com.diya.backend.dto.dashboard;

import java.util.Locale;

public enum KpiMetric {
    NEW_ORDERS,
    PAYMENTS,
    PENDING_ORDERS,
    SALES;

    public static KpiMetric parse(String raw) {
        if (raw == null || raw.isBlank()) {
            return NEW_ORDERS;
        }
        try {
            return KpiMetric.valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            return NEW_ORDERS;
        }
    }
}
