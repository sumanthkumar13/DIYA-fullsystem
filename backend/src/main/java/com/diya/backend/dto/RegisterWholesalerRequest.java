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

    // Step 2 — Business type (required for new signups)
    private String businessType;

    /** @deprecated Prefer {@code businessType}. Kept for older clients. */
    @Deprecated
    private List<String> categories;

    // Step 3 — Business Details
    private String businessName;
    private String gstin;
    private String pincode;
    /** Required. Legacy clients may still send {@code city} — server maps it if region is blank. */
    private String region;
    /** @deprecated Use {@code region}. Kept for backward-compatible JSON. */
    @Deprecated
    private String city;
    private String fullAddress;

    /**
     * Optional. Defaults to {@code DELIVERY} on the server when omitted.
     *
     * @deprecated Signup no longer collects this; kept for older API clients.
     */
    @Deprecated
    private String deliveryModel;

    // Payment Setup
    private String upiId;
    private String qrCodeUrl; // Optional (null if skipped)
}
