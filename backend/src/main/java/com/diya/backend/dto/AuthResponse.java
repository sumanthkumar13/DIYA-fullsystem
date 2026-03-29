package com.diya.backend.dto;

import lombok.*;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthResponse {
    private String token;
    private String name;
    private String role;
    private String authType; // EMAIL or PHONE
    private UUID wholesalerId;
    private UUID retailerId;

    /**
     * Retailer account activation status.
     * Expected values: CREATED_BY_WHOLESALER, ACTIVATION_REQUIRED, ACTIVE
     */
    private String accountStatus;
}
