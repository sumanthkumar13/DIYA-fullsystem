package com.diya.backend.controller;

import com.diya.backend.dto.connection.ConnectionResponseDTO;
import com.diya.backend.dto.connection.ConnectionStatusUpdateDTO;
import com.diya.backend.entity.Connection;
import com.diya.backend.service.ConnectionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/wholesaler/connections")
@RequiredArgsConstructor
public class WholesalerConnectionController {

    private final ConnectionService connectionService;

    private String getAuthType(Authentication auth) {
        return auth.getName().contains("@") ? "EMAIL" : "PHONE";
    }

    // ✅ NEW: get all connections (Pending + Approved + Rejected)
    @GetMapping
    public ResponseEntity<List<ConnectionResponseDTO>> allConnections() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return ResponseEntity.ok(
                connectionService.getAllConnectionsForWholesaler(auth.getName(), getAuthType(auth)));
    }

    // existing endpoint - keep it
    @GetMapping("/requests")
    public ResponseEntity<List<ConnectionResponseDTO>> pendingRequests() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return ResponseEntity.ok(
                connectionService.getPendingRequestsForWholesaler(auth.getName(), getAuthType(auth)));
    }

    @PutMapping("/{connectionId}")
    public ResponseEntity<ConnectionResponseDTO> updateStatus(
            @PathVariable UUID connectionId,
            @RequestBody ConnectionStatusUpdateDTO req) {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        Connection.Status status = req.getStatus();
        if (status == null)
            throw new RuntimeException("Status is required");

        return ResponseEntity.ok(
                connectionService.updateConnectionStatus(auth.getName(), getAuthType(auth), connectionId, status));
    }
}
