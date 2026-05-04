package com.diya.backend.controller;

import com.diya.backend.dto.AuthResponse;
import com.diya.backend.dto.LoginRequest;
import com.diya.backend.dto.RegisterRetailerRequest;
import com.diya.backend.dto.RegisterWholesalerRequest;
import com.diya.backend.entity.User;
import com.diya.backend.repository.RetailerRepository;
import com.diya.backend.repository.UserRepository;
import com.diya.backend.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "*", allowedHeaders = "*", methods = { RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT,
        RequestMethod.DELETE, RequestMethod.OPTIONS })

public class AuthController {

    private final AuthService authService;
    private final UserRepository userRepository;
    private final RetailerRepository retailerRepository;

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null || auth.getName().isBlank()) {
            Map<String, Object> resp = new HashMap<>();
            resp.put("success", false);
            resp.put("message", "Unauthorized");
            return ResponseEntity.status(401).body(resp);
        }

        String identifier = auth.getName(); // email or phone (JWT subject)
        String authType = identifier.contains("@") ? "EMAIL" : "PHONE";
        String role = auth.getAuthorities() == null || auth.getAuthorities().isEmpty()
                ? null
                : auth.getAuthorities().iterator().next().getAuthority(); // e.g. ROLE_RETAILER
        if (role != null && role.startsWith("ROLE_")) role = role.substring(5);

        User user = "EMAIL".equals(authType)
                ? userRepository.findByEmail(identifier).orElse(null)
                : userRepository.findByPhone(identifier).orElse(null);

        boolean retailerProfileExists = false;
        try {
            retailerProfileExists = "EMAIL".equals(authType)
                    ? retailerRepository.findByUserEmail(identifier).isPresent()
                    : retailerRepository.findByUserPhone(identifier).isPresent();
        } catch (Exception ignored) {
            retailerProfileExists = false;
        }

        Map<String, Object> data = new HashMap<>();
        data.put("identifier", identifier);
        data.put("authType", authType);
        data.put("role", role);
        data.put("retailerProfileExists", retailerProfileExists);
        if (user != null) {
            data.put("id", user.getId());
            data.put("name", user.getName());
            data.put("phone", user.getPhone());
            data.put("email", user.getEmail());
            data.put("isActive", user.isActive());
        }

        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("data", data);
        return ResponseEntity.ok(resp);
    }

    /*
     * ----------------------------------------------------
     * SEND OTP
     * Expects JSON: { "phone": "9876543210" }
     * ----------------------------------------------------
     */
    @PostMapping("/send-otp")
    public ResponseEntity<Map<String, Object>> sendOtp(@RequestBody Map<String, String> req) {
        String phone = req.get("phone");
        Map<String, Object> resp = new HashMap<>();

        if (phone == null || phone.isBlank()) {
            resp.put("success", false);
            resp.put("message", "Phone number is required");
            return ResponseEntity.badRequest().body(resp);
        }

        try {
            String otp = authService.sendOtp(phone);
            resp.put("success", true);
            resp.put("message", "OTP sent successfully");
            resp.put("otp", otp);
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            resp.put("success", false);
            resp.put("message", "Failed to send OTP: " + e.getMessage());
            return ResponseEntity.status(500).body(resp);
        }
    }

    /*
     * ----------------------------------------------------
     * VERIFY OTP
     * Expects JSON: { "phone": "9876543210", "otp": "123456" }
     * ----------------------------------------------------
     */
    @PostMapping("/verify-otp")
    public ResponseEntity<Map<String, Object>> verifyOtp(@RequestBody Map<String, String> req) {
        String phone = req.get("phone");
        String otp = req.get("otp");
        Map<String, Object> resp = new HashMap<>();

        if (phone == null || phone.isBlank() || otp == null || otp.isBlank()) {
            resp.put("success", false);
            resp.put("message", "Phone and OTP are required");
            return ResponseEntity.badRequest().body(resp);
        }

        try {
            boolean valid = authService.verifyOtp(phone, otp);
            if (!valid) {
                resp.put("success", false);
                resp.put("message", "Invalid or expired OTP");
                return ResponseEntity.badRequest().body(resp);
            }
            resp.put("success", true);
            resp.put("message", "OTP verified successfully");
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            resp.put("success", false);
            resp.put("message", "OTP verification failed: " + e.getMessage());
            return ResponseEntity.status(500).body(resp);
        }
    }

    /*
     * ----------------------------------------------------
     * SET PASSWORD / ACTIVATE ACCOUNT
     * Expects JSON: { "phone": "9876543210", "newPassword": "secret" }
     * ----------------------------------------------------
     */
    @PostMapping("/set-password")
    public ResponseEntity<Map<String, Object>> setPassword(@RequestBody Map<String, String> req) {
        String phone = req.get("phone");
        String newPassword = req.get("newPassword");
        Map<String, Object> resp = new HashMap<>();

        if (phone == null || phone.isBlank() || newPassword == null || newPassword.isBlank()) {
            resp.put("success", false);
            resp.put("message", "Phone and new password are required");
            return ResponseEntity.badRequest().body(resp);
        }

        try {
            AuthResponse auth = authService.setPassword(phone, newPassword);
            resp.put("success", true);
            resp.put("message", "Password set successfully");
            resp.put("data", auth);
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            resp.put("success", false);
            resp.put("message", e.getMessage() == null ? "Set password failed" : e.getMessage());
            return ResponseEntity.badRequest().body(resp);
        }
    }

    /*
     * ----------------------------------------------------
     * REGISTER WHOLESALER (FINAL ONBOARDING)
     * Expects JSON matching RegisterWholesalerRequest
     * Returns AuthResponse inside data
     * ----------------------------------------------------
     */
    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> registerWholesaler(@RequestBody RegisterWholesalerRequest req) {
        Map<String, Object> resp = new HashMap<>();
        try {
            AuthResponse auth = authService.registerWholesaler(req);
            resp.put("success", true);
            resp.put("message", "User registered successfully");
            resp.put("data", auth);
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            resp.put("success", false);
            resp.put("message", e.getMessage() == null ? "Registration failed" : e.getMessage());
            return ResponseEntity.badRequest().body(resp);
        }
    }

    /*
     * ----------------------------------------------------
     * REGISTER RETAILER
     * ----------------------------------------------------
     */
    @PostMapping("/register-retailer")
    public ResponseEntity<Map<String, Object>> registerRetailer(@RequestBody RegisterRetailerRequest req) {
        Map<String, Object> resp = new HashMap<>();
        try {
            AuthResponse auth = authService.registerRetailer(req);
            resp.put("success", true);
            resp.put("message", "Retailer registered successfully");
            resp.put("data", auth);
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            resp.put("success", false);
            resp.put("message", e.getMessage() == null ? "Registration failed" : e.getMessage());
            return ResponseEntity.badRequest().body(resp);
        }
    }

    /*
     * ----------------------------------------------------
     * LOGIN
     * Expects JSON matching LoginRequest (phone & password)
     * ----------------------------------------------------
     */
    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody LoginRequest req) {
        Map<String, Object> resp = new HashMap<>();
        try {
            AuthResponse auth = authService.login(req);
            resp.put("success", true);
            resp.put("message", "Login successful");
            resp.put("data", auth);
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            resp.put("success", false);
            resp.put("message", e.getMessage() == null ? "Login failed" : e.getMessage());
            return ResponseEntity.badRequest().body(resp);
        }
    }
}
