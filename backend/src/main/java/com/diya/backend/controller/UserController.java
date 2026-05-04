package com.diya.backend.controller;

import com.diya.backend.dto.UserDTO;
import com.diya.backend.entity.User;
import com.diya.backend.repository.UserRepository;
import com.diya.backend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Map;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@CrossOrigin(origins = "*") // for frontend access
public class UserController {

    private final UserService userService;
    private final UserRepository userRepository;

    @PostMapping("/register")
    public ResponseEntity<User> registerUser(@RequestBody UserDTO userDTO) {
        User user = userService.registerUser(userDTO);
        return ResponseEntity.ok(user);
    }

    @GetMapping("/all")
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @GetMapping("/{id}")
    public ResponseEntity<User> getUserById(@PathVariable UUID id) {
        return ResponseEntity.ok(userService.getUserById(id));
    }

    @GetMapping("/me")
    public ResponseEntity<?> me() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String identifier = auth != null ? auth.getName() : null;
        if (identifier == null || identifier.isBlank()) {
            return ResponseEntity.status(401).body(Map.of("message", "Unauthenticated"));
        }
        User user = identifier.contains("@")
                ? userRepository.findByEmail(identifier).orElse(null)
                : userRepository.findByPhone(identifier).orElse(null);
        if (user == null) {
            return ResponseEntity.status(404).body(Map.of("message", "User not found"));
        }
        return ResponseEntity.ok(user);
    }

    @PutMapping("/me/avatar")
    public ResponseEntity<?> updateAvatar(@RequestBody Map<String, Object> body) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String identifier = auth != null ? auth.getName() : null;
        if (identifier == null || identifier.isBlank()) {
            return ResponseEntity.status(401).body(Map.of("message", "Unauthenticated"));
        }
        String url = body != null && body.get("avatarUrl") != null ? String.valueOf(body.get("avatarUrl")) : "";
        url = url != null ? url.trim() : "";
        User user = identifier.contains("@")
                ? userRepository.findByEmail(identifier).orElse(null)
                : userRepository.findByPhone(identifier).orElse(null);
        if (user == null) {
            return ResponseEntity.status(404).body(Map.of("message", "User not found"));
        }
        user.setAvatarUrl(url.isEmpty() ? null : url);
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("avatarUrl", user.getAvatarUrl()));
    }
}
