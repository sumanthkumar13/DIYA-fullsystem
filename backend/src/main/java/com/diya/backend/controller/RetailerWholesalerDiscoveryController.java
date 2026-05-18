package com.diya.backend.controller;

import com.diya.backend.dto.connection.WholesalerSearchDTO;
import com.diya.backend.entity.Wholesaler;
import com.diya.backend.repository.WholesalerRepository;
import com.diya.backend.service.ConnectionService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/retailer/wholesalers")
@RequiredArgsConstructor
public class RetailerWholesalerDiscoveryController {

    private final WholesalerRepository wholesalerRepository;
    private final ConnectionService connectionService;

    /**
     * ✅ Retailer search supports ONLY:
     * 1) Shop Name (businessName)
     * 2) Invite Code (DIYA-XXXX)
     *
     * Blocked wholesalers are excluded from results.
     */
    @GetMapping("/search")
    public List<WholesalerSearchDTO> search(@RequestParam(required = false) String q) {

        if (q == null || q.isBlank())
            return Collections.emptyList();

        String query = q.trim();
        Set<UUID> blockedIds = blockedWholesalerIdsForCurrentRetailer();

        List<WholesalerSearchDTO> results;

        // ✅ Invite code search (exact)
        if (query.toUpperCase(Locale.ROOT).startsWith("DIYA-")) {
            results = wholesalerRepository.findByInviteCode(query.toUpperCase(Locale.ROOT))
                    .filter(w -> w.getVisibilityMode() == Wholesaler.VisibilityMode.PUBLIC)
                    .map(w -> List.of(toDto(w)))
                    .orElse(Collections.emptyList());
        } else {
            // ✅ Shop name search (partial match)
            results = wholesalerRepository.findByBusinessNameContainingIgnoreCase(query)
                    .stream()
                    .filter(w -> w.getVisibilityMode() == Wholesaler.VisibilityMode.PUBLIC)
                    .map(this::toDto)
                    .toList();
        }

        if (blockedIds.isEmpty()) {
            return results;
        }

        return results.stream()
                .filter(dto -> dto.id == null || !blockedIds.contains(dto.id))
                .toList();
    }

    private Set<UUID> blockedWholesalerIdsForCurrentRetailer() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || auth.getName() == null || auth.getName().isBlank()) {
                return Set.of();
            }
            return connectionService.getBlockedWholesalerIdsForRetailer(auth.getName());
        } catch (Exception e) {
            return Set.of();
        }
    }

    private WholesalerSearchDTO toDto(Wholesaler w) {
        return WholesalerSearchDTO.builder()
                .id(w.getId())
                .businessName(w.getBusinessName())
                .handle(w.getHandle())
                .city(w.getCity())
                .state(w.getState())
                .pincode(w.getPincode())
                .visibilityMode(w.getVisibilityMode())
                .inviteCode(w.getInviteCode())
                .build();
    }
}
