package com.diya.backend.controller;

import com.diya.backend.entity.Retailer;
import com.diya.backend.entity.RetailerOtp;
import com.diya.backend.entity.User;
import com.diya.backend.config.JwtUtil;
import com.diya.backend.repository.RetailerOtpRepository;
import com.diya.backend.repository.RetailerRepository;
import com.diya.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Random;

@RestController
@RequestMapping("/api/retailer")
@RequiredArgsConstructor
public class RetailerLoginController {

    private static final int OTP_VALIDITY_MINUTES = 5;

    private final RetailerRepository retailerRepository;
    private final RetailerOtpRepository retailerOtpRepository;
    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final Random random = new Random();
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    /**
     * Determine retailer login flow by phone number.
     *
     * POST /api/retailer/login-phone
     * Body: { "phone": "9876543210" }
     *
     * Cases:
     * - Retailer not found           -> { "status": "NOT_REGISTERED" }
     * - Found, accountClaimed=false  -> { "status": "OTP_REQUIRED", "retailerId": "...", "phone": "..." }
     * - Found, accountClaimed=true   -> { "status": "PASSWORD_LOGIN_REQUIRED" }
     *
     * This endpoint does NOT generate or send an OTP; it only decides the flow.
     */
    @PostMapping("/login-phone")
    public ResponseEntity<Map<String, Object>> loginByPhone(@RequestBody Map<String, String> body) {
        String phone = body.get("phone");
        Map<String, Object> resp = new HashMap<>();

        if (phone == null || phone.isBlank()) {
            resp.put("status", "NOT_REGISTERED");
            return ResponseEntity.ok(resp);
        }

        return retailerRepository.findByPhoneContact(phone)
                .map(r -> {
                    Map<String, Object> ok = new HashMap<>();
                    if (!r.isAccountClaimed()) {
                        ok.put("status", "OTP_REQUIRED");
                        ok.put("retailerId", r.getId());
                        ok.put("phone", phone);
                    } else {
                        ok.put("status", "PASSWORD_LOGIN_REQUIRED");
                    }
                    return ResponseEntity.ok(ok);
                })
                .orElseGet(() -> {
                    Map<String, Object> notFound = new HashMap<>();
                    notFound.put("status", "NOT_REGISTERED");
                    return ResponseEntity.ok(notFound);
                });
    }

    /**
     * Generate OTP for retailer account claim.
     *
     * POST /api/retailer/request-otp
     * Body: { "phone": "9876543210" }
     *
     * Behaviour:
     * 1) Verify retailer exists by phoneContact
     * 2) Generate 6-digit OTP
     * 3) Store in RetailerOtp table with 5-minute expiry
     * 4) Return OTP in response (for development; later SMS)
     */
    @PostMapping("/request-otp")
    public ResponseEntity<Map<String, Object>> requestOtp(@RequestBody Map<String, String> body) {
        String phone = body.get("phone");
        Map<String, Object> resp = new HashMap<>();

        if (phone == null || phone.isBlank()) {
            resp.put("status", "NOT_REGISTERED");
            return ResponseEntity.ok(resp);
        }

        return retailerRepository.findByPhoneContact(phone)
                .map(r -> {
                    // Generate 6-digit numeric OTP
                    String otp = String.format("%06d", random.nextInt(1_000_000));
                    LocalDateTime now = LocalDateTime.now();
                    LocalDateTime expiresAt = now.plusMinutes(OTP_VALIDITY_MINUTES);

                    RetailerOtp entry = RetailerOtp.builder()
                            .phone(phone)
                            .otp(otp)
                            .createdAt(now)
                            .expiresAt(expiresAt)
                            .build();
                    retailerOtpRepository.save(entry);

                    Map<String, Object> ok = new HashMap<>();
                    ok.put("otp", otp); // For development: return OTP so frontend can auto-fill
                    return ResponseEntity.ok(ok);
                })
                .orElseGet(() -> {
                    Map<String, Object> notFound = new HashMap<>();
                    notFound.put("status", "NOT_REGISTERED");
                    return ResponseEntity.ok(notFound);
                });
    }

    /**
     * Verify OTP and allow retailer to set password.
     *
     * POST /api/retailer/verify-otp
     * Body: { "phone": "9876543210", "otp": "123456", "password": "newpassword" }
     *
     * Logic:
     * 1) Verify OTP record exists for phone
     * 2) Check expiry
     * 3) Match OTP
     * 4) If valid -> update retailer flags and password, then clean up OTP
     */
    @PostMapping("/verify-otp")
    @Transactional
    public ResponseEntity<Map<String, Object>> verifyOtpAndSetPassword(@RequestBody Map<String, String> body) {
        String phone = body.get("phone");
        String otp = body.get("otp");
        String password = body.get("password");
        Map<String, Object> resp = new HashMap<>();

        if (phone == null || phone.isBlank() || otp == null || otp.isBlank() || password == null || password.isBlank()) {
            resp.put("status", "INVALID_REQUEST");
            return ResponseEntity.badRequest().body(resp);
        }

        return verifyOtpThenActivateAndIssueToken(phone, otp, password);
    }

    /**
     * Alias endpoint for mobile clients that call /api/retailer/set-password.
     * Behaves the same as /api/retailer/verify-otp and returns a JWT on success.
     *
     * POST /api/retailer/set-password
     * Body: { "phone": "9876543210", "otp": "123456", "password": "newpassword" }
     *
     * Note: Some older clients send { "phone": "...", "newPassword": "..." } — we accept that too.
     */
    @PostMapping("/set-password")
    @Transactional
    public ResponseEntity<Map<String, Object>> setPassword(@RequestBody Map<String, String> body) {
        String phone = body.get("phone");
        String otp = body.get("otp");
        String password = body.get("password");
        if (password == null || password.isBlank()) {
            password = body.get("newPassword");
        }

        Map<String, Object> resp = new HashMap<>();
        if (phone == null || phone.isBlank() || otp == null || otp.isBlank() || password == null || password.isBlank()) {
            resp.put("status", "INVALID_REQUEST");
            resp.put("message", "phone, otp and password are required");
            return ResponseEntity.badRequest().body(resp);
        }

        return verifyOtpThenActivateAndIssueToken(phone, otp, password);
    }

    private ResponseEntity<Map<String, Object>> verifyOtpThenActivateAndIssueToken(
            String phone,
            String otp,
            String password) {
        Map<String, Object> resp = new HashMap<>();

        // Find latest OTP entry for this phone
        RetailerOtp entry = retailerOtpRepository.findTopByPhoneOrderByCreatedAtDesc(phone).orElse(null);
        if (entry == null) {
            resp.put("status", "INVALID_OTP");
            return ResponseEntity.ok(resp);
        }

        LocalDateTime now = LocalDateTime.now();
        if (entry.getExpiresAt().isBefore(now)) {
            resp.put("status", "OTP_EXPIRED");
            // cleanup expired OTPs for this phone
            retailerOtpRepository.deleteByPhoneOrExpiresAtBefore(phone, now);
            return ResponseEntity.ok(resp);
        }

        if (!entry.getOtp().equals(otp)) {
            resp.put("status", "INVALID_OTP");
            return ResponseEntity.ok(resp);
        }

        Retailer retailer = retailerRepository.findByPhoneContact(phone).orElse(null);
        if (retailer == null) {
            resp.put("status", "NOT_REGISTERED");
            return ResponseEntity.ok(resp);
        }

        String encodedPassword = passwordEncoder.encode(password);

        // Ensure activated retailers always have a linked User
        if (retailer.getUser() == null) {
            User existing = userRepository.findByPhone(phone).orElse(null);
            if (existing != null) {
                // If a user already exists for this phone, link it (but avoid role mismatch)
                if (existing.getRole() != User.Role.RETAILER) {
                    resp.put("status", "INVALID_REQUEST");
                    resp.put("message", "Phone already registered with a different role");
                    return ResponseEntity.badRequest().body(resp);
                }
                retailer.setUser(existing);
            } else {
                User user = User.builder()
                        .name(retailer.getShopName() != null && !retailer.getShopName().isBlank() ? retailer.getShopName() : "Retailer")
                        .phone(phone)
                        .email(null)
                        .password(encodedPassword)
                        .role(User.Role.RETAILER)
                        .isActive(true)
                        .build();
                userRepository.save(user);
                retailer.setUser(user);
            }
        }

        retailer.setAccountStatus(Retailer.AccountStatus.ACTIVE);
        retailer.setOtpVerified(true);
        retailer.setAccountClaimed(true);
        retailer.setClaimedAt(now);
        retailer.setPassword(encodedPassword);
        retailerRepository.save(retailer);

        // Cleanup OTPs for this phone
        retailerOtpRepository.deleteByPhoneOrExpiresAtBefore(phone, now);

        // Generate JWT token for retailer
        String token = jwtUtil.generateToken(phone, "PHONE", "RETAILER");

        resp.put("token", token);
        resp.put("role", "RETAILER");
        resp.put("status", "ACCOUNT_ACTIVATED");
        resp.put("retailerId", retailer.getId());
        return ResponseEntity.ok(resp);
    }

    /**
     * Retailer login using phone + password.
     *
     * POST /api/retailer/login
     * Body: { "phone": "9876543210", "password": "******" }
     *
     * Logic:
     * 1) Find retailer by phoneContact
     * 2) Require accountClaimed == true
     * 3) Verify password using BCrypt
     * 4) Generate JWT token with role=RETAILER
     */
    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> retailerPasswordLogin(@RequestBody Map<String, String> body) {
        String phone = body.get("phone");
        String password = body.get("password");
        Map<String, Object> resp = new HashMap<>();

        if (phone == null || phone.isBlank() || password == null || password.isBlank()) {
            resp.put("status", "INVALID_REQUEST");
            return ResponseEntity.badRequest().body(resp);
        }

        Retailer retailer = retailerRepository.findByPhoneContact(phone).orElse(null);
        if (retailer == null) {
            resp.put("status", "NOT_REGISTERED");
            return ResponseEntity.ok(resp);
        }

        if (!retailer.isAccountClaimed() || retailer.getPassword() == null) {
            // Account not yet activated via OTP+password flow
            resp.put("status", "ACCOUNT_NOT_CLAIMED");
            return ResponseEntity.ok(resp);
        }

        if (!passwordEncoder.matches(password, retailer.getPassword())) {
            resp.put("status", "INVALID_CREDENTIALS");
            return ResponseEntity.ok(resp);
        }

        // Generate JWT token for retailer
        String token = jwtUtil.generateToken(phone, "PHONE", "RETAILER");

        resp.put("token", token);
        resp.put("retailerId", retailer.getId());
        resp.put("role", "RETAILER");
        resp.put("status", "LOGIN_SUCCESS");
        return ResponseEntity.ok(resp);
    }
}


