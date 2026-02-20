package com.diya.backend.config;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class JwtPrincipal {
    private String identifier; // email OR phone
    private String authType; // EMAIL or PHONE
    private String role; // RETAILER or WHOLESALER
}
