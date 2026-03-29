package com.diya.backend.service;

import com.diya.backend.config.JwtUtil;
import com.diya.backend.dto.*;
import com.diya.backend.entity.User;
import com.diya.backend.entity.Wholesaler;
import com.diya.backend.repository.UserRepository;
import com.diya.backend.repository.WholesalerRepository;
import com.diya.backend.entity.Retailer;
import com.diya.backend.repository.RetailerRepository;
import com.diya.backend.util.BusinessTypeCatalog;
import com.diya.backend.util.RegionCatalog;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final WholesalerRepository wholesalerRepository;
    private final RetailerRepository retailerRepository;
    private final JwtUtil jwtUtil;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final OtpService otpService;

    /*
     * -----------------------------------------------------------
     * INVITE CODE GENERATION (Enterprise safe)
     * -----------------------------------------------------------
     */
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String PREFIX = "DIYA-";

    // Avoid confusing characters: I, O, 0, 1
    private static final String CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    private String generateInviteCode(int length) {
        StringBuilder sb = new StringBuilder(PREFIX);
        for (int i = 0; i < length; i++) {
            sb.append(CHARS.charAt(RANDOM.nextInt(CHARS.length())));
        }
        return sb.toString().toUpperCase(Locale.ROOT);
    }

    private String generateUniqueInviteCode() {
        // collisions extremely rare, but enterprise-safe
        for (int i = 0; i < 10; i++) {
            String code = generateInviteCode(4); // ex: DIYA-7K2P
            if (!wholesalerRepository.existsByInviteCode(code))
                return code;
        }

        // fallback to longer code
        for (int i = 0; i < 10; i++) {
            String code = generateInviteCode(6); // ex: DIYA-7K2P9X
            if (!wholesalerRepository.existsByInviteCode(code))
                return code;
        }

        throw new RuntimeException("Unable to generate unique invite code. Please try again.");
    }

    /*
     * -----------------------------------------------------------
     * SEND OTP ✅
     * -----------------------------------------------------------
     */
    public String sendOtp(String phone) {
        return otpService.generateOtp(phone);
    }

    /*
     * -----------------------------------------------------------
     * VERIFY OTP
     * -----------------------------------------------------------
     */
    public boolean verifyOtp(String phone, String otp) {
        return otpService.verifyOtp(phone, otp);
    }

    /*
     * -----------------------------------------------------------
     * REGISTER WHOLESALER
     * -----------------------------------------------------------
     */
    public AuthResponse registerWholesaler(RegisterWholesalerRequest req) {

        String region = req.getRegion();
        if (region == null || region.isBlank()) {
            region = req.getCity();
        }
        RegionCatalog.requireValidRegion(region);
        region = region.trim();

        BusinessTypeCatalog.requireValidBusinessType(req.getBusinessType());
        String businessType = req.getBusinessType().trim();

        List<String> categories = req.getCategories();
        if (categories == null || categories.isEmpty()) {
            categories = List.of(businessType);
        }

        // Check mobile uniqueness
        userRepository.findByPhone(req.getMobile()).ifPresent(u -> {
            throw new RuntimeException("Mobile number already registered");
        });

        // Create User
        User user = User.builder()
                .name(req.getFullName())
                .phone(req.getMobile())
                .email(req.getEmail())
                .password(passwordEncoder.encode(req.getPassword()))
                .role(User.Role.WHOLESALER)
                .isActive(true)
                .build();

        userRepository.save(user);

        // Create unique @handle
        String baseHandle = "@" + req.getBusinessName().toLowerCase().replaceAll(" ", "");
        String handle = baseHandle;
        int count = 1;

        while (wholesalerRepository.findByHandle(handle).isPresent()) {
            handle = baseHandle + count;
            count++;
        }

        Wholesaler.DeliveryModel deliveryEnum = Wholesaler.DeliveryModel.DELIVERY;
        if (req.getDeliveryModel() != null && !req.getDeliveryModel().isBlank()) {
            try {
                deliveryEnum = Wholesaler.DeliveryModel.valueOf(req.getDeliveryModel().trim().toUpperCase());
            } catch (Exception ignored) {
            }
        }

        // ✅ Generate inviteCode (unique ID for retailer search)
        String inviteCode = generateUniqueInviteCode();

        // Create wholesaler profile
        Wholesaler wholesaler = Wholesaler.builder()
                .user(user)
                .handle(handle)
                .businessName(req.getBusinessName())
                .businessType(businessType)
                .gstin(req.getGstin())
                .city(region)
                .region(region)
                .state("Not Provided")
                .pincode(req.getPincode())
                .address(req.getFullAddress())
                .categories(categories)
                .deliveryModel(deliveryEnum)
                .upiId(req.getUpiId())
                .upiQrImage(req.getQrCodeUrl())
                .invoiceSequence(0)
                .visibilityMode(Wholesaler.VisibilityMode.PUBLIC)
                .inviteCode(inviteCode) // ✅ NEW FIELD
                .build();

        wholesalerRepository.save(wholesaler);

        // Create token
        System.out.println("[AUTHSERVICE] Generating token for registerWholesaler - phone: " + user.getPhone());
        String token = jwtUtil.generateToken(
                user.getPhone(),
                "PHONE",
                user.getRole().name());
        System.out.println("[AUTHSERVICE] Token generated successfully");

        return AuthResponse.builder()
                .token(token)
                .name(user.getName())
                .role("WHOLESALER")
                .wholesalerId(wholesaler.getId())
                .build();
    }

    /*
     * -----------------------------------------------------------
     * REGISTER RETAILER
     * -----------------------------------------------------------
     */
    public AuthResponse registerRetailer(RegisterRetailerRequest req) {

        // Validate phone/email uniqueness across both User and Retailer tables
        userRepository.findByPhone(req.getPhone()).ifPresent(u -> {
            throw new RuntimeException("Phone already registered");
        });
        retailerRepository.findByPhoneContact(req.getPhone()).ifPresent(r -> {
            throw new RuntimeException("Phone already registered");
        });

        if (req.getEmail() != null && !req.getEmail().isEmpty()) {
            userRepository.findByEmail(req.getEmail()).ifPresent(u -> {
                throw new RuntimeException("Email already registered");
            });
        }

        // Create User
        User user = User.builder()
                .name(req.getName())
                .phone(req.getPhone())
                .email(req.getEmail())
                .password(passwordEncoder.encode(req.getPassword()))
                .role(User.Role.RETAILER)
                .isActive(true)
                .build();

        userRepository.save(user);

        // Create Retailer Profile
        Retailer retailer = Retailer.builder()
                .user(user)
                .shopName(req.getBusinessName())
                .address(req.getAddress())
                .city(req.getCity())
                .state(req.getState() != null ? req.getState() : "Not Provided")
                .phoneContact(req.getPhone())
                .password(user.getPassword())
                .isActive(true)
                .gstNumber(req.getGstin())
                .accountStatus(Retailer.AccountStatus.ACTIVE)
                // Self-signup retailers already have a verified account & password
                .accountClaimed(true)
                .otpVerified(true)
                .claimedAt(java.time.LocalDateTime.now())
                .build();

        retailerRepository.save(retailer);

        // Determine authType
        String authType = req.getEmail() != null && req.getEmail().contains("@")
                ? "EMAIL"
                : "PHONE";

        // Generate token
        String identifier = authType.equals("PHONE") ? req.getPhone() : req.getEmail();
        System.out.println("[AUTHSERVICE] Generating token for registerRetailer - identifier: " + identifier
                + ", authType: " + authType);
        String token = jwtUtil.generateToken(
                identifier,
                authType,
                "RETAILER");
        System.out.println("[AUTHSERVICE] Token generated successfully");

        return AuthResponse.builder()
                .token(token)
                .name(user.getName())
                .role("RETAILER")
                .retailerId(retailer.getId())
                .authType(authType)
                .build();
    }

    /*
     * -----------------------------------------------------------
     * LOGIN
     * -----------------------------------------------------------
     */
    public AuthResponse login(LoginRequest req) {

        String identifier = req.getIdentifier();
        String password = req.getPassword();

        if (identifier == null || identifier.isBlank()) {
            throw new RuntimeException("Phone number or email is required");
        }

        // Email login (existing behavior)
        if (identifier.contains("@")) {
            if (password == null || password.isBlank()) {
                throw new RuntimeException("Password required");
            }

            User user = userRepository.findByEmail(identifier)
                    .orElseThrow(() -> new RuntimeException("Invalid email or password"));

            if (!passwordEncoder.matches(password, user.getPassword())) {
                throw new RuntimeException("Invalid credentials");
            }

            String token = generateTokenForUser(identifier, "EMAIL", user);
            return AuthResponse.builder()
                    .token(token)
                    .name(user.getName())
                    .role(user.getRole().name())
                    .authType("EMAIL")
                    .build();
        }

        // Phone login
        if (password == null || password.isBlank()) {
            // If a user already exists, require password
            if (userRepository.findByPhone(identifier).isPresent()) {
                throw new RuntimeException("Password required");
            }

            // Otherwise, check if this phone belongs to an invited retailer
            Retailer retailer = retailerRepository.findByPhoneContact(identifier)
                    .orElseThrow(() -> new RuntimeException("Retailer not registered"));

            if (retailer.getAccountStatus() == Retailer.AccountStatus.INVITED
                    || retailer.getAccountStatus() == Retailer.AccountStatus.CREATED_BY_WHOLESALER) {
                // Trigger activation flow
                sendOtp(identifier);
                retailer.setAccountStatus(Retailer.AccountStatus.ACTIVATION_REQUIRED);
                retailerRepository.save(retailer);
                return AuthResponse.builder()
                        .role("RETAILER")
                        .accountStatus("ACTIVATION_REQUIRED")
                        .retailerId(retailer.getId())
                        .build();
            }

            // Already active but no password provided
            throw new RuntimeException("Password required");
        }

        // Password provided - normal login
        User user = userRepository.findByPhone(identifier)
                .orElseThrow(() -> {
                    // If retailer exists but not activated, prompt activation
                    retailerRepository.findByPhoneContact(identifier).ifPresent(r -> {
                        if (r.getAccountStatus() == Retailer.AccountStatus.INVITED
                                || r.getAccountStatus() == Retailer.AccountStatus.CREATED_BY_WHOLESALER) {
                            throw new RuntimeException("Account activation required");
                        }
                    });
                    return new RuntimeException("Invalid phone number or password");
                });

        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new RuntimeException("Invalid credentials");
        }

        String token = generateTokenForUser(identifier, "PHONE", user);
        return AuthResponse.builder()
                .token(token)
                .name(user.getName())
                .role(user.getRole().name())
                .authType("PHONE")
                .build();
    }

    private String generateTokenForUser(String identifier, String authType, User user) {
        System.out.println("[AUTHSERVICE] Generating token for login - identifier: " + identifier + ", authType: "
                + authType + ", role: " + user.getRole().name());
        String token = jwtUtil.generateToken(
                identifier,
                authType,
                user.getRole().name());
        System.out.println("[AUTHSERVICE] Token generated successfully");
        return token;
    }

    public AuthResponse setPassword(String phone, String newPassword) {
        if (phone == null || phone.isBlank()) {
            throw new RuntimeException("Phone number is required");
        }
        if (newPassword == null || newPassword.isBlank() || newPassword.length() < 6) {
            throw new RuntimeException("Password must be at least 6 characters");
        }

        if (!otpService.isVerified(phone)) {
            throw new RuntimeException("OTP verification required");
        }

        Retailer retailer = retailerRepository.findByPhoneContact(phone)
                .orElseThrow(() -> new RuntimeException("Retailer not registered"));

        if (!(retailer.getAccountStatus() == Retailer.AccountStatus.INVITED
                || retailer.getAccountStatus() == Retailer.AccountStatus.CREATED_BY_WHOLESALER
                || retailer.getAccountStatus() == Retailer.AccountStatus.ACTIVATION_REQUIRED)) {
            throw new RuntimeException("Retailer account is already active");
        }

        // Ensure we don't create duplicate users
        if (userRepository.findByPhone(phone).isPresent()) {
            throw new RuntimeException("User already exists with this phone");
        }

        User user = User.builder()
                .name(retailer.getShopName() != null ? retailer.getShopName() : "Retailer")
                .phone(phone)
                .email(null)
                .password(passwordEncoder.encode(newPassword))
                .role(User.Role.RETAILER)
                .isActive(true)
                .build();

        userRepository.save(user);

        retailer.setUser(user);
        retailer.setPassword(passwordEncoder.encode(newPassword));
        retailer.setAccountStatus(Retailer.AccountStatus.ACTIVE);
        retailerRepository.save(retailer);

        otpService.consumeVerified(phone);

        String token = jwtUtil.generateToken(phone, "PHONE", "RETAILER");

        return AuthResponse.builder()
                .token(token)
                .name(user.getName())
                .role("RETAILER")
                .authType("PHONE")
                .retailerId(retailer.getId())
                .accountStatus("ACTIVE")
                .build();
    }

    /**
     * Logged-in wholesaler changes password (JWT subject = phone or email).
     */
    @Transactional
    public void changePasswordForWholesaler(String identifier, String currentPassword, String newPassword) {
        if (currentPassword == null || currentPassword.isBlank()) {
            throw new RuntimeException("Current password is required");
        }
        if (newPassword == null || newPassword.isBlank()) {
            throw new RuntimeException("New password is required");
        }
        if (newPassword.length() < 6) {
            throw new RuntimeException("New password must be at least 6 characters");
        }

        User user = identifier.contains("@")
                ? userRepository.findByEmail(identifier)
                        .orElseThrow(() -> new RuntimeException("User not found"))
                : userRepository.findByPhone(identifier)
                        .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getRole() != User.Role.WHOLESALER) {
            throw new RuntimeException("Only wholesaler accounts can change password here");
        }

        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new RuntimeException("Current password is incorrect");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }
}
