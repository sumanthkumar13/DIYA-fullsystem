package com.diya.backend.controller;

import com.diya.backend.dto.AuthResponse;
import com.diya.backend.dto.LoginRequest;
import com.diya.backend.dto.RegisterRetailerRequest;
import com.diya.backend.dto.RegisterWholesalerRequest;
import com.diya.backend.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "*", allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.OPTIONS})

public class AuthController {

    private final AuthService authService;

    /* ----------------------------------------------------
     *  SEND OTP
     *  Expects JSON: { "phone": "9876543210" }
     * ---------------------------------------------------- */
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
            authService.sendOtp(phone);
            resp.put("success", true);
            resp.put("message", "OTP sent successfully (check backend logs)");
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            resp.put("success", false);
            resp.put("message", "Failed to send OTP: " + e.getMessage());
            return ResponseEntity.status(500).body(resp);
        }
    }

    /* ----------------------------------------------------
     *  VERIFY OTP
     *  Expects JSON: { "phone": "9876543210", "otp": "123456" }
     * ---------------------------------------------------- */
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

    /* ----------------------------------------------------
     *  REGISTER WHOLESALER (FINAL ONBOARDING)
     *  Expects JSON matching RegisterWholesalerRequest
     *  Returns AuthResponse inside data
     * ---------------------------------------------------- */
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

    /* ----------------------------------------------------
     *  REGISTER RETAILER
     * ---------------------------------------------------- */
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

    /* ----------------------------------------------------
     *  LOGIN
     *  Expects JSON matching LoginRequest (phone & password)
     * ---------------------------------------------------- */
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
