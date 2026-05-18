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
    public DashboardKpiDTO getKpi(@RequestParam(required = false) String region) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return dashboardService.getKpiData(
                getIdentifier(auth),
                getAuthType(auth),
                region);
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

    @GetMapping("/kpi-widget")
    public KpiWidgetDTO kpiWidget(
            @RequestParam String metric,
            @RequestParam(defaultValue = "TODAY") String period,
            @RequestParam(required = false) String region) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return dashboardService.getKpiWidget(
                getIdentifier(auth),
                getAuthType(auth),
                metric,
                period,
                region);
    }

    /**
     * Paginated retailer-wise sales for the selected time period and region.
     */
    @GetMapping("/sales-details")
    public SalesDetailsPageDTO salesDetails(
            @RequestParam(required = false) String region,
            @RequestParam(defaultValue = "TODAY") String period,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return dashboardService.getSalesDetails(
                getIdentifier(auth),
                getAuthType(auth),
                region,
                period,
                page,
                size);
    }
}
