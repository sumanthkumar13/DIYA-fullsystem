package com.diya.backend.service;

import com.diya.backend.config.JwtUtil;
import com.diya.backend.dto.*;
import com.diya.backend.entity.User;
import com.diya.backend.entity.Wholesaler;
import com.diya.backend.repository.UserRepository;
import com.diya.backend.repository.WholesalerRepository;
import com.diya.backend.entity.Retailer;
import com.diya.backend.repository.RetailerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

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
    public void sendOtp(String phone) {
        otpService.generateOtp(phone);
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

        // Delivery model mapping
        Wholesaler.DeliveryModel deliveryEnum = Wholesaler.DeliveryModel.DELIVERY;
        if (req.getDeliveryModel() != null) {
            try {
                deliveryEnum = Wholesaler.DeliveryModel.valueOf(req.getDeliveryModel().toUpperCase());
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
                .gstin(req.getGstin())
                .city(req.getCity())
                .state("Not Provided")
                .pincode(req.getPincode())
                .address(req.getFullAddress())
                .categories(req.getCategories())
                .deliveryModel(deliveryEnum)
                .upiId(req.getUpiId())
                .upiQrImage(req.getQrCodeUrl())
                .invoiceSequence(0)
                .visibilityMode(Wholesaler.VisibilityMode.PUBLIC)
                .inviteCode(inviteCode) // ✅ NEW FIELD
                .build();

        wholesalerRepository.save(wholesaler);

        // Create token
        String token = jwtUtil.generateToken(
                user.getPhone(),
                "PHONE",
                user.getRole().name());

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

        // Validate phone/email uniqueness
        userRepository.findByPhone(req.getPhone()).ifPresent(u -> {
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
                .isActive(true)
                .build();

        retailerRepository.save(retailer);

        // Determine authType
        String authType = req.getEmail() != null && req.getEmail().contains("@")
                ? "EMAIL"
                : "PHONE";

        // Generate token
        String token = jwtUtil.generateToken(
                authType.equals("PHONE") ? req.getPhone() : req.getEmail(),
                authType,
                "RETAILER");

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

        User user;

        if (identifier.contains("@")) {
            user = userRepository.findByEmail(identifier)
                    .orElseThrow(() -> new RuntimeException("Invalid email or password"));
        } else {
            user = userRepository.findByPhone(identifier)
                    .orElseThrow(() -> new RuntimeException("Invalid phone number or password"));
        }

        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new RuntimeException("Invalid credentials");
        }

        String authType = identifier.contains("@") ? "EMAIL" : "PHONE";

        String token = jwtUtil.generateToken(
                identifier,
                authType,
                user.getRole().name());

        return AuthResponse.builder()
                .token(token)
                .name(user.getName())
                .role(user.getRole().name())
                .authType(authType)
                .build();
    }
}
