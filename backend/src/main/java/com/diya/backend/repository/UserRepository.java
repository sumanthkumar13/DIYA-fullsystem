package com.diya.backend.repository;

import com.diya.backend.entity.User;
import com.diya.backend.entity.User.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByPhone(String phone);

    Optional<User> findByEmail(String email);

    boolean existsByPhone(String phone);

    boolean existsByEmail(String email);

    List<User> findByRole(Role role);

    List<User> findByIsActive(boolean isActive);
}
