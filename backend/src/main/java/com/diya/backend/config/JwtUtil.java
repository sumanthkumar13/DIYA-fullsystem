package com.diya.backend.config;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;
import java.util.Map;

@Component
public class JwtUtil {

    private final String SECRET = "diya_secret_key_12345678901234567890";
    private final Key key = Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));
    private final long EXP_MS = 1000L * 60 * 60 * 10; // 10 hours

    // Generate token WITH identifier + authType
    public String generateToken(String identifier, String authType, String role) {

        return Jwts.builder()
                .setSubject(identifier) // email OR phone
                .claim("authType", authType) // EMAIL or PHONE
                .claim("role", role) // WHOLESALER or RETAILER
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + EXP_MS))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    // Extract identifier (email OR phone)
    public String extractIdentifier(String token) {
        return getAllClaims(token).getSubject();
    }

    // Extract authType
    public String extractAuthType(String token) {
        return (String) getAllClaims(token).get("authType");
    }

    // Extract role
    public String extractRole(String token) {
        return (String) getAllClaims(token).get("role");
    }

    public boolean validateToken(String token) {
        try {
            getAllClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private Claims getAllClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}
