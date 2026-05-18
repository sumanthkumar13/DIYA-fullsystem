package com.diya.backend.dto.dashboard;

import java.util.Locale;

public enum KpiTimePeriod {
    TODAY,
    YESTERDAY,
    THIS_WEEK,
    THIS_MONTH;

    public static KpiTimePeriod parse(String raw) {
        if (raw == null || raw.isBlank()) {
            return TODAY;
        }
        try {
            return KpiTimePeriod.valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            return TODAY;
        }
    }
}
