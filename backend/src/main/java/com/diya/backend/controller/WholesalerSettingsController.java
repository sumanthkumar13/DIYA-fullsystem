package com.diya.backend.controller;

import com.diya.backend.dto.ChangePasswordRequest;
import com.diya.backend.dto.WholesalerSettingsDTO;
import com.diya.backend.dto.connection.VisibilityModeUpdateDTO;
import com.diya.backend.entity.Wholesaler;
import com.diya.backend.repository.WholesalerRepository;
import com.diya.backend.service.AuthService;
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
    private final AuthService authService;

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

    /**
     * Change password for the authenticated wholesaler. Body: {@code currentPassword}, {@code newPassword}.
     */
    @PutMapping("/password")
    public ResponseEntity<Map<String, Object>> changePassword(@RequestBody ChangePasswordRequest req) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null || auth.getName().isBlank()) {
            return ResponseEntity.status(401).body(Map.of(
                    "success", false,
                    "message", "Not authenticated"));
        }
        try {
            authService.changePasswordForWholesaler(
                    auth.getName(),
                    req != null ? req.getCurrentPassword() : null,
                    req != null ? req.getNewPassword() : null);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Password updated successfully"));
        } catch (RuntimeException e) {
            // Always 400 so clients don't treat wrong current password as session expiry (401).
            String msg = e.getMessage() == null ? "Could not update password" : e.getMessage();
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", msg));
        }
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
