package com.diya.backend.service;

import com.diya.backend.dto.connection.ConnectionResponseDTO;
import com.diya.backend.entity.Connection;
import com.diya.backend.entity.Retailer;
import com.diya.backend.entity.User;
import com.diya.backend.entity.Wholesaler;
import com.diya.backend.repository.ConnectionRepository;
import com.diya.backend.repository.RetailerRepository;
import com.diya.backend.repository.UserRepository;
import com.diya.backend.repository.WholesalerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class ConnectionService {

    private final ConnectionRepository connectionRepository;
    private final WholesalerRepository wholesalerRepository;
    private final RetailerRepository retailerRepository;
    private final UserRepository userRepository;

    /* ------------------------ Retailer APIs ------------------------ */

    /**
     * Enterprise Rule (Mode A):
     * Retailer request is ALWAYS PENDING.
     * Wholesaler must approve manually.
     */
    public ConnectionResponseDTO requestConnection(String identifier, UUID wholesalerId) {
        Retailer retailer = resolveRetailer(identifier);

        Wholesaler wholesaler = wholesalerRepository.findById(wholesalerId)
                .orElseThrow(() -> new RuntimeException("Wholesaler not found"));

        Optional<Connection> existingOpt = connectionRepository.findByWholesalerAndRetailer(wholesaler, retailer);

        // ✅ Idempotency:
        // If already exists, just return existing (don't create duplicate requests)
        if (existingOpt.isPresent()) {
            Connection existing = existingOpt.get();

            // If already approved -> return it
            if (existing.getStatus() == Connection.Status.APPROVED) {
                return toDto(existing);
            }

            // If pending -> return it (avoid multiple pending requests)
            if (existing.getStatus() == Connection.Status.PENDING) {
                return toDto(existing);
            }

            // If rejected/blocked -> treat as new request? (Business decision)
            // For B2B: allow re-request by converting back to PENDING
            if (existing.getStatus() == Connection.Status.REJECTED) {
                existing.setStatus(Connection.Status.PENDING);
                existing.setRequestedAt(LocalDateTime.now());
                existing.setRespondedAt(null);
                return toDto(connectionRepository.save(existing));
            }

            if (existing.getStatus() == Connection.Status.BLOCKED) {
                throw new RuntimeException("Connection blocked by wholesaler");
            }

            return toDto(existing);
        }

        Connection conn = Connection.builder()
                .wholesaler(wholesaler)
                .retailer(retailer)
                .status(Connection.Status.PENDING)
                .requestedAt(LocalDateTime.now())
                .respondedAt(null)
                .build();

        conn = connectionRepository.save(conn);
        return toDto(conn);
    }

    public List<ConnectionResponseDTO> getMyConnections(String identifier) {
        Retailer retailer = resolveRetailer(identifier);

        return connectionRepository.findByRetailerOrderByRequestedAtDesc(retailer)
                .stream()
                .map(this::toDto)
                .toList();
    }

    public List<ConnectionResponseDTO> getApprovedWholesalers(String identifier) {
        Retailer retailer = resolveRetailer(identifier);

        return connectionRepository.findByRetailerAndStatusOrderByRequestedAtDesc(
                retailer, Connection.Status.APPROVED)
                .stream()
                .map(this::toDto)
                .toList();
    }

    /* ------------------------ Wholesaler APIs ------------------------ */

    public List<ConnectionResponseDTO> getPendingRequestsForWholesaler(String identifier, String authType) {
        Wholesaler wholesaler = resolveWholesaler(identifier, authType);

        return connectionRepository
                .findByWholesalerAndStatusOrderByRequestedAtDesc(wholesaler, Connection.Status.PENDING)
                .stream()
                .map(this::toDto)
                .toList();
    }

    /**
     * Enterprise rule:
     * Wholesaler can only approve/reject pending requests.
     */
    public ConnectionResponseDTO updateConnectionStatus(
            String identifier,
            String authType,
            UUID connectionId,
            Connection.Status newStatus) {
        Wholesaler wholesaler = resolveWholesaler(identifier, authType);

        Connection conn = connectionRepository.findById(connectionId)
                .orElseThrow(() -> new RuntimeException("Connection not found"));

        // ✅ security check
        if (!conn.getWholesaler().getId().equals(wholesaler.getId())) {
            throw new RuntimeException("Access denied");
        }

        // ✅ validate status
        if (newStatus == null) {
            throw new RuntimeException("Status is required");
        }

        // ✅ enforce workflow
        Connection.Status current = conn.getStatus();

        // Only pending requests can be approved/rejected
        if (current != Connection.Status.PENDING) {
            throw new RuntimeException("Only pending requests can be updated");
        }

        if (newStatus != Connection.Status.APPROVED && newStatus != Connection.Status.REJECTED) {
            throw new RuntimeException("Only APPROVED or REJECTED allowed");
        }

        conn.setStatus(newStatus);
        conn.setRespondedAt(LocalDateTime.now());

        conn = connectionRepository.save(conn);
        return toDto(conn);
    }

    /* ------------------------ Enforcement helper ------------------------ */

    public void ensureRetailerConnectedToWholesaler(Retailer retailer, Wholesaler wholesaler) {
        Connection conn = connectionRepository.findByWholesalerAndRetailer(wholesaler, retailer)
                .orElseThrow(() -> new RuntimeException("No connection with wholesaler"));

        if (conn.getStatus() != Connection.Status.APPROVED) {
            throw new RuntimeException("Connection not approved");
        }
    }

    /* ------------------------ Resolvers ------------------------ */

    private Retailer resolveRetailer(String identifier) {
        User user;
        if (identifier.contains("@")) {
            user = userRepository.findByEmail(identifier)
                    .orElseThrow(() -> new RuntimeException("User not found"));
        } else {
            user = userRepository.findByPhone(identifier)
                    .orElseThrow(() -> new RuntimeException("User not found"));
        }

        return retailerRepository.findByUserId(user.getId())
                .orElseThrow(() -> new RuntimeException("Retailer profile not found"));
    }

    private Wholesaler resolveWholesaler(String identifier, String authType) {
        if ("EMAIL".equalsIgnoreCase(authType)) {
            return wholesalerRepository.findByUserEmail(identifier)
                    .orElseThrow(() -> new RuntimeException("Wholesaler not found"));
        } else {
            return wholesalerRepository.findByUserPhone(identifier)
                    .orElseThrow(() -> new RuntimeException("Wholesaler not found"));
        }
    }

    public List<ConnectionResponseDTO> getAllConnectionsForWholesaler(String identifier, String authType) {
        Wholesaler wholesaler = resolveWholesaler(identifier, authType);

        return connectionRepository
                .findByWholesalerOrderByRequestedAtDesc(wholesaler)
                .stream()
                .map(this::toDto)
                .toList();
    }

    private ConnectionResponseDTO toDto(Connection c) {
        Wholesaler w = c.getWholesaler();
        Retailer r = c.getRetailer();

        return ConnectionResponseDTO.builder()
                .id(c.getId())
                .wholesalerId(w != null ? w.getId() : null)
                .retailerId(r != null ? r.getId() : null)
                .status(c.getStatus())
                .requestedAt(c.getRequestedAt())
                .respondedAt(c.getRespondedAt())

                // wholesaler preview (for retailer)
                .wholesalerBusinessName(w != null ? w.getBusinessName() : null)
                .wholesalerHandle(w != null ? w.getHandle() : null)
                .wholesalerCity(w != null ? w.getCity() : null)

                // retailer preview (for wholesaler)
                .retailerBusinessName(r != null ? r.getShopName() : null)
                .retailerCity(r != null ? r.getCity() : null)
                .retailerPhone(r != null ? r.getPhoneContact() : null)
                .build();
    }
}
