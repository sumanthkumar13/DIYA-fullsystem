package com.diya.backend.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.Customizer;
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

                        // IMPORTANT: enable cors processing
                        .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                        .authorizeHttpRequests(auth -> auth
                                    .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                                    /*
                                     * =====================================================
                                     * TEMPORARY DEPLOYMENT MODE
                                     * Allow everything so frontend can connect first
                                     * We will re-enable role security after login works.
                                     * =====================================================
                                     */
                                    .requestMatchers("/**").permitAll()

                        /*
                         * ================= ORIGINAL RULES (KEPT SAFE) =================
                         * 
                         * PUBLIC
                         * .requestMatchers("/api/auth/**").permitAll()
                         * .requestMatchers("/api/public/**").permitAll()
                         * 
                         * STATIC
                         * .requestMatchers("/uploads/**", "/static/**", "/public/**").permitAll()
                         * 
                         * OPTIONS (CORS preflight)
                         * .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                         * 
                         * WHOLESALER
                         * .requestMatchers(
                         * "/api/wholesaler/categories/**",
                         * "/api/wholesaler/subcategories/**",
                         * "/api/wholesaler/products/**",
                         * "/api/wholesaler/orders/**",
                         * "/api/wholesaler/connections/**",
                         * "/api/wholesaler/dashboard/**",
                         * "/api/wholesaler/settings/**")
                         * .hasRole("WHOLESALER")
                         * 
                         * .requestMatchers("/api/hsn/**").hasRole("WHOLESALER")
                         * .requestMatchers("/api/invoices/**").hasRole("WHOLESALER")
                         * .requestMatchers("/api/tally/**").hasRole("WHOLESALER")
                         * 
                         * RETAILER
                         * .requestMatchers("/api/retailer/**").hasRole("RETAILER")
                         * 
                         * EVERYTHING ELSE
                         * .anyRequest().authenticated()
                         * 
                         * =====================================================
                         * END ORIGINAL SECURITY (COMMENTED TEMPORARILY)
                         * =====================================================
                         */
                        )

                        // keep JWT filter in chain (we are not removing your security system)
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

            // THIS is the magic line
            configuration.setAllowedOriginPatterns(Arrays.asList(
                        "http://localhost:*",
                        "https://*.vercel.app"));

            configuration.setAllowedMethods(Arrays.asList(
                        "GET", "POST", "PUT", "DELETE", "OPTIONS"));

            configuration.setAllowedHeaders(Arrays.asList("*"));
            configuration.setAllowCredentials(true);

            UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
            source.registerCorsConfiguration("/**", configuration);

            return source;
      }
}