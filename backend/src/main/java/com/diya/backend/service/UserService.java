package com.diya.backend.service;

import com.diya.backend.dto.UserDTO;
import com.diya.backend.entity.User;
import com.diya.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    // Register new user
    public User registerUser(UserDTO dto) {
        User user = User.builder()
                .name(dto.getName())
                .email(dto.getEmail())
                .phone(dto.getPhone())
                .role(User.Role.valueOf(dto.getRole().toUpperCase()))
                .isActive(true)
                .build();

        return userRepository.save(user);
    }

    // Get all users
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    // Get single user by ID
    public User getUserById(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}
