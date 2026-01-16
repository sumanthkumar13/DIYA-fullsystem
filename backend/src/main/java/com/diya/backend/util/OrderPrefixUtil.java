package com.diya.backend.util;

import com.diya.backend.entity.Wholesaler;

public class OrderPrefixUtil {

    // Build prefix: first 3 letters from businessName (uppercase, alphanum) + last
    // 4 chars of wholesaler UUID (uppercase)
    public static String buildPrefix(Wholesaler wholesaler) {
        String name = wholesaler.getBusinessName() == null ? wholesaler.getHandle() : wholesaler.getBusinessName();
        String initials = extractInitials(name);
        String uuidPart = extractUuidTail(wholesaler.getId().toString());
        return (initials + uuidPart).toUpperCase();
    }

    private static String extractInitials(String name) {
        if (name == null || name.isBlank())
            return "ORG";
        // keep only letters & digits, remove spaces
        String cleaned = name.replaceAll("[^A-Za-z0-9]", "");
        if (cleaned.length() >= 3) {
            return cleaned.substring(0, 3);
        } else {
            // pad or take full cleaned
            StringBuilder sb = new StringBuilder(cleaned);
            while (sb.length() < 3) {
                sb.append('X');
            }
            return sb.toString();
        }
    }

    private static String extractUuidTail(String uuid) {
        if (uuid == null)
            return "0000";
        // get only hexadecimal chars, return last 4
        String cleaned = uuid.replaceAll("[^A-Za-z0-9]", "");
        if (cleaned.length() <= 4) {
            StringBuilder sb = new StringBuilder();
            while (sb.length() + cleaned.length() < 4) {
                sb.append('0');
            }
            sb.append(cleaned);
            return sb.toString();
        }
        return cleaned.substring(cleaned.length() - 4);
    }

    public static String formatOrderNumber(String prefix, int sequence) {
        return String.format("%s-%04d", prefix, sequence);
    }
}
