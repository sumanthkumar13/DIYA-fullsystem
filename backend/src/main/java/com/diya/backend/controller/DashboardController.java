package com.diya.backend.controller;

import com.diya.backend.dto.dashboard.*;
import com.diya.backend.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/wholesaler/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    private String getIdentifier(Authentication auth) {
        return auth.getName(); // phone or email
    }

    private String getAuthType(Authentication auth) {
        String identifier = auth.getName();
        return identifier.contains("@") ? "EMAIL" : "PHONE";
    }

    @GetMapping("/kpi")
    public DashboardKpiDTO getKpi() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return dashboardService.getKpiData(
                getIdentifier(auth),
                getAuthType(auth));
    }

    @GetMapping("/territory")
    public TerritoryDTO getTerritory() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return dashboardService.getTerritoryStats(
                getIdentifier(auth),
                getAuthType(auth));
    }

    @GetMapping("/activity")
    public List<ActivityItemDTO> getActivity() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return dashboardService.getActivityFeed(
                getIdentifier(auth),
                getAuthType(auth));
    }
}
