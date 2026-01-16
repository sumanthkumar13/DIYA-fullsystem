package com.diya.backend.dto;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RegisterWholesalerRequest {

    // Step 1 — Owner Details
    private String fullName;
    private String mobile;
    private String email;
    private String password;

    // Step 2 — Categories
    private List<String> categories;

    // Step 3 — Business Details
    private String businessName;
    private String gstin;
    private String pincode;
    private String city;
    private String fullAddress;

    // Step 4 — Delivery Model ("DELIVERY" / "PICKUP")
    private String deliveryModel;

    // Step 5 — Payment Setup
    private String upiId;
    private String qrCodeUrl; // Optional (null if skipped)
}
