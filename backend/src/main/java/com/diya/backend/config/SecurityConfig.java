package com.diya.backend.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.http.HttpMethod;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

      private final JwtAuthFilter jwtAuthFilter;

      @Bean
      public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

            http
                        .csrf(csrf -> csrf.disable())
                        .cors(cors -> {
                        })
                        .authorizeHttpRequests(auth -> auth

                                    /* PUBLIC */
                                    .requestMatchers("/api/auth/**").permitAll()
                                    .requestMatchers("/api/public/**").permitAll()

                                    /* STATIC */
                                    .requestMatchers("/uploads/**", "/static/**", "/public/**").permitAll()

                                    /* OPTIONS */
                                    .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                                    /* WHOLESALER */
                                    .requestMatchers(
                                                "/api/wholesaler/categories/**",
                                                "/api/wholesaler/subcategories/**",
                                                "/api/wholesaler/products/**",
                                                "/api/wholesaler/orders/**",
                                                "/api/wholesaler/connections/**",
                                                "/api/wholesaler/dashboard/**")
                                    .hasRole("WHOLESALER")

                                    /* RETAILER */
                                    .requestMatchers("/api/retailer/**").hasRole("RETAILER")

                                    /* EVERYTHING ELSE */
                                    .anyRequest().authenticated())
                        .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

            return http.build();
      }

      @Bean
      public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
            return config.getAuthenticationManager();
      }

      @Bean
      public BCryptPasswordEncoder passwordEncoder() {
            return new BCryptPasswordEncoder();
      }

      @Bean
      public CorsConfigurationSource corsConfigurationSource() {
            CorsConfiguration configuration = new CorsConfiguration();
            configuration.setAllowedOrigins(Arrays.asList(
                        "http://localhost:5000",
                        "http://localhost:5173",
                        "http://localhost:3000"));
            configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
            configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type"));
            configuration.setAllowCredentials(true);

            UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
            source.registerCorsConfiguration("/**", configuration);
            return source;
      }
}
