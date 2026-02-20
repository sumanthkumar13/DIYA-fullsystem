package com.diya.backend.controller;

import com.diya.backend.dto.WholesalerSettingsDTO;
import com.diya.backend.dto.connection.VisibilityModeUpdateDTO;
import com.diya.backend.entity.Wholesaler;
import com.diya.backend.repository.WholesalerRepository;
import com.diya.backend.service.WholesalerSettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/wholesaler/settings")
@RequiredArgsConstructor
public class WholesalerSettingsController {

    private final WholesalerRepository wholesalerRepository;
    private final WholesalerSettingsService wholesalerSettingsService;

    private Wholesaler resolveWholesaler(String identifier) {
        if (identifier.contains("@")) {
            return wholesalerRepository.findByUserEmail(identifier)
                    .orElseThrow(() -> new RuntimeException("Wholesaler not found"));
        } else {
            return wholesalerRepository.findByUserPhone(identifier)
                    .orElseThrow(() -> new RuntimeException("Wholesaler not found"));
        }
    }

    @GetMapping
    public ResponseEntity<WholesalerSettingsDTO> getSettings() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        WholesalerSettingsDTO dto = wholesalerSettingsService.getSettings(auth.getName());
        return ResponseEntity.ok(dto);
    }

    @PutMapping
    public ResponseEntity<WholesalerSettingsDTO> updateSettings(@RequestBody WholesalerSettingsDTO dto) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        WholesalerSettingsDTO updated = wholesalerSettingsService.updateSettings(auth.getName(), dto);
        return ResponseEntity.ok(updated);
    }

    @GetMapping("/visibility")
    public ResponseEntity<Map<String, String>> getVisibilityMode() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Wholesaler w = resolveWholesaler(auth.getName());

        return ResponseEntity.ok(Map.of(
                "visibilityMode", w.getVisibilityMode().name()));
    }

    @PutMapping("/visibility")
    public ResponseEntity<Map<String, String>> updateVisibilityMode(
            @RequestBody VisibilityModeUpdateDTO req) {
        if (req.getVisibilityMode() == null) {
            throw new RuntimeException("visibilityMode is required");
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Wholesaler w = resolveWholesaler(auth.getName());

        w.setVisibilityMode(req.getVisibilityMode());
        wholesalerRepository.save(w);

        return ResponseEntity.ok(Map.of(
                "visibilityMode", w.getVisibilityMode().name()));
    }
}
