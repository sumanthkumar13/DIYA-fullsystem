package com.diya.backend.controller;

import com.diya.backend.dto.connection.ConnectionRequestDTO;
import com.diya.backend.dto.connection.ConnectionResponseDTO;
import com.diya.backend.service.ConnectionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/retailer/connections")
@RequiredArgsConstructor
public class RetailerConnectionController {

    private final ConnectionService connectionService;

    @PostMapping("/request")
    public ResponseEntity<ConnectionResponseDTO> request(@RequestBody ConnectionRequestDTO req) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String identifier = auth.getName();
        return ResponseEntity.ok(connectionService.requestConnection(identifier, req.getWholesalerId()));
    }

    @GetMapping
    public ResponseEntity<List<ConnectionResponseDTO>> myConnections() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String identifier = auth.getName();
        return ResponseEntity.ok(connectionService.getMyConnections(identifier));
    }

    @GetMapping("/approved")
    public ResponseEntity<List<ConnectionResponseDTO>> approved() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String identifier = auth.getName();
        return ResponseEntity.ok(connectionService.getApprovedWholesalers(identifier));
    }
}
