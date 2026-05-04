package com.diya.backend.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RegisterRetailerRequest {
    private String name;
    private String email;
    private String phone;
    private String password;
    private String role; // WHOLESALER / RETAILER

    // Business Details
    private String businessName;
    private String gstin;
    private String pincode;
    /**
     * Required. Territory label for analytics (e.g. India Post PostOffice name from pincode lookup).
     */
    private String region;
    private String city;
    private String address;
    private String state; // Added state as it might be useful, though frontend sends city/pincode/address

    // Categories
    private java.util.List<String> categories;

    // Delivery Model
    private String deliveryModel; // "delivery" or "pickup"

    // Payment
    private String upiId;
    private String upiQrImage; // Base64 or URL
}
