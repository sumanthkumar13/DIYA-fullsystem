package com.diya.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.Random;

@Service
@Slf4j
public class OtpService {

    private final Map<String, String> otpStore = new HashMap<>();
    private final Random random = new Random();

    // Generate OTP
    public String generateOtp(String phone) {
        String otp = String.valueOf(100000 + random.nextInt(900000));
        otpStore.put(phone, otp);

        log.info("📌 OTP for {} is {}", phone, otp); // Visible in backend logs for testing

        return otp;
    }

    // Validate OTP
    public boolean verifyOtp(String phone, String otp) {
        if (!otpStore.containsKey(phone))
            return false;
        boolean match = otpStore.get(phone).equals(otp);

        if (match) {
            otpStore.remove(phone); // Remove after success
        }

        return match;
    }
}
