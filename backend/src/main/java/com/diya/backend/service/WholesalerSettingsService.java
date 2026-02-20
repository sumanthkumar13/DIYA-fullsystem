package com.diya.backend.service;

import com.diya.backend.dto.WholesalerSettingsDTO;
import com.diya.backend.entity.User;
import com.diya.backend.entity.Wholesaler;
import com.diya.backend.repository.UserRepository;
import com.diya.backend.repository.WholesalerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class WholesalerSettingsService {

    private final WholesalerRepository wholesalerRepository;
    private final UserRepository userRepository;

    /**
     * Resolve wholesaler by JWT identifier (email or phone).
     */
    private Wholesaler resolveWholesaler(String identifier) {
        if (identifier.contains("@")) {
            return wholesalerRepository.findByUserEmail(identifier)
                    .orElseThrow(() -> new RuntimeException("Wholesaler not found"));
        }
        return wholesalerRepository.findByUserPhone(identifier)
                .orElseThrow(() -> new RuntimeException("Wholesaler not found"));
    }

    @Transactional(readOnly = true)
    public WholesalerSettingsDTO getSettings(String identifier) {
        Wholesaler w = resolveWholesaler(identifier);
        User u = w.getUser();

        return new WholesalerSettingsDTO(
                w.getBusinessName(),
                u != null ? u.getName() : null,
                u != null ? u.getPhone() : null,
                w.getAddress(),
                w.getGstin(),
                w.getVisibilityMode(),
                u != null ? u.getEmail() : null
        );
    }

    @Transactional
    public WholesalerSettingsDTO updateSettings(String identifier, WholesalerSettingsDTO dto) {
        Wholesaler w = resolveWholesaler(identifier);
        User u = w.getUser();

        if (dto.getBusinessName() != null) {
            w.setBusinessName(dto.getBusinessName());
        }
        if (dto.getAddress() != null) {
            w.setAddress(dto.getAddress());
        }
        if (dto.getGstin() != null) {
            w.setGstin(dto.getGstin());
        }
        if (dto.getVisibilityMode() != null) {
            w.setVisibilityMode(dto.getVisibilityMode());
        }

        if (u != null) {
            if (dto.getOwnerName() != null) {
                u.setName(dto.getOwnerName());
            }
            if (dto.getPhone() != null) {
                u.setPhone(dto.getPhone());
            }
            userRepository.save(u);
        }

        wholesalerRepository.save(w);

        return getSettings(identifier);
    }
}
