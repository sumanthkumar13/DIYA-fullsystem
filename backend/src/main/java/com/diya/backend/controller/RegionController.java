package com.diya.backend.controller;

import com.diya.backend.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/regions")
@RequiredArgsConstructor
public class RegionController {

    private final DashboardService dashboardService;

    private String authType(String identifier) {
        return identifier != null && identifier.contains("@") ? "EMAIL" : "PHONE";
    }

    /**
     * Distinct retailer {@code region} values for APPROVED connections of the logged-in wholesaler.
     */
    @GetMapping("/active")
    public List<String> activeRegions() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String identifier = auth.getName();
        return dashboardService.getActiveRetailerRegions(identifier, authType(identifier));
    }
}
