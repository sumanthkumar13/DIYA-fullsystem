package com.diya.backend.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import lombok.RequiredArgsConstructor;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;

import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

        private final JwtUtil jwtUtil;

        /**
         * ✅ Enterprise-grade rule:
         * Do NOT apply JWT validation on public endpoints.
         * Even if Authorization header contains an expired token.
         */
        @Override
        protected boolean shouldNotFilter(HttpServletRequest request) {
                String path = request.getServletPath();
                return path.startsWith("/api/auth/")
                                || path.startsWith("/api/public/")
                                || path.startsWith("/uploads/")
                                || path.startsWith("/static/")
                                || path.startsWith("/swagger-ui/")
                                || path.startsWith("/v3/api-docs");
        }

        @Override
        protected void doFilterInternal(
                        HttpServletRequest request,
                        HttpServletResponse response,
                        FilterChain filterChain) throws ServletException, IOException {

                final String authHeader = request.getHeader("Authorization");

                // No JWT → continue normally
                if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                        filterChain.doFilter(request, response);
                        return;
                }

                final String token = authHeader.substring(7);

                try {
                        // ✅ Validate first (do not extract claims before validation)
                        if (!jwtUtil.validateToken(token)) {
                                filterChain.doFilter(request, response);
                                return;
                        }

                        final String identifier = jwtUtil.extractIdentifier(token);
                        final String role = jwtUtil.extractRole(token);

                        if (identifier != null
                                        && role != null
                                        && SecurityContextHolder.getContext().getAuthentication() == null) {

                                String normalizedRole = role.startsWith("ROLE_") ? role.substring(5) : role;

                                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                                                identifier,
                                                null,
                                                List.of(new SimpleGrantedAuthority("ROLE_" + normalizedRole)));

                                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                                SecurityContextHolder.getContext().setAuthentication(authentication);
                        }

                        filterChain.doFilter(request, response);

                } catch (io.jsonwebtoken.ExpiredJwtException e) {
                        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                        response.setContentType("application/json");
                        response.getWriter().write("{\"message\":\"Token expired. Please login again.\"}");
                } catch (Exception e) {
                        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                        response.setContentType("application/json");
                        response.getWriter().write("{\"message\":\"Invalid token.\"}");
                }
        }
}
