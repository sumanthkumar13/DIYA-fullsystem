package com.diya.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.Random;

@Service
@Slf4j
public class OtpService {

    private static final long OTP_VALIDITY_MS = 5 * 60 * 1000; // 5 minutes
    private static final int MAX_VERIFY_ATTEMPTS = 5;

    private final Map<String, OtpEntry> otpStore = new HashMap<>();
    private final Map<String, Long> verifiedPhones = new HashMap<>();
    private final Random random = new Random();

    private static class OtpEntry {
        String otp;
        long expiresAt;
        int attempts;

        OtpEntry(String otp, long expiresAt) {
            this.otp = otp;
            this.expiresAt = expiresAt;
            this.attempts = 0;
        }
    }

    private void cleanupExpired() {
        long now = System.currentTimeMillis();
        otpStore.entrySet().removeIf(e -> e.getValue().expiresAt < now);
        verifiedPhones.entrySet().removeIf(e -> e.getValue() < now);
    }

    // Generate OTP
    public String generateOtp(String phone) {
        cleanupExpired();

        String otp = String.valueOf(100000 + random.nextInt(900000));
        long expiresAt = System.currentTimeMillis() + OTP_VALIDITY_MS;
        otpStore.put(phone, new OtpEntry(otp, expiresAt));

        log.info("📌 OTP for {} is {}", phone, otp); // Visible in backend logs for testing

        return otp;
    }

    // Validate OTP
    public boolean verifyOtp(String phone, String otp) {
        cleanupExpired();

        OtpEntry entry = otpStore.get(phone);
        if (entry == null) {
            return false;
        }

        if (entry.attempts >= MAX_VERIFY_ATTEMPTS) {
            otpStore.remove(phone);
            return false;
        }

        boolean match = entry.otp.equals(otp);

        if (match) {
            otpStore.remove(phone);
            verifiedPhones.put(phone, System.currentTimeMillis() + OTP_VALIDITY_MS);
            return true;
        }

        entry.attempts++;
        return false;
    }

    /**
     * Checks if the given phone number has a recently verified OTP.
     */
    public boolean isVerified(String phone) {
        cleanupExpired();
        return verifiedPhones.containsKey(phone);
    }

    /**
     * Consume a verification token so it cannot be reused.
     */
    public boolean consumeVerified(String phone) {
        cleanupExpired();
        return verifiedPhones.remove(phone) != null;
    }
}
