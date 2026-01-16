package com.diya.backend.controller;

import com.diya.backend.dto.connection.WholesalerSearchDTO;
import com.diya.backend.entity.Wholesaler;
import com.diya.backend.repository.WholesalerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/api/retailer/wholesalers")
@RequiredArgsConstructor
public class RetailerWholesalerDiscoveryController {

    private final WholesalerRepository wholesalerRepository;

    /**
     * ✅ Retailer search supports ONLY:
     * 1) Shop Name (businessName)
     * 2) Invite Code (DIYA-XXXX)
     *
     * Examples:
     * /search?q=Balaji
     * /search?q=DIYA-7K2P
     */
    @GetMapping("/search")
    public List<WholesalerSearchDTO> search(@RequestParam(required = false) String q) {

        if (q == null || q.isBlank())
            return Collections.emptyList();

        String query = q.trim();

        // ✅ Invite code search (exact)
        if (query.toUpperCase(Locale.ROOT).startsWith("DIYA-")) {
            return wholesalerRepository.findByInviteCode(query.toUpperCase(Locale.ROOT))
                    .filter(w -> w.getVisibilityMode() == Wholesaler.VisibilityMode.PUBLIC)
                    .map(w -> List.of(toDto(w)))
                    .orElse(Collections.emptyList());
        }

        // ✅ Shop name search (partial match)
        return wholesalerRepository.findByBusinessNameContainingIgnoreCase(query)
                .stream()
                .filter(w -> w.getVisibilityMode() == Wholesaler.VisibilityMode.PUBLIC)
                .map(this::toDto)
                .toList();
    }

    private WholesalerSearchDTO toDto(Wholesaler w) {
        return WholesalerSearchDTO.builder()
                .id(w.getId())
                .businessName(w.getBusinessName())
                .handle(w.getHandle()) // keep if UI uses it, else can remove later
                .city(w.getCity())
                .state(w.getState())
                .pincode(w.getPincode())
                .visibilityMode(w.getVisibilityMode())
                .inviteCode(w.getInviteCode()) // ✅ new
                .build();
    }
}
