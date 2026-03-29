package com.diya.backend.repository;

import com.diya.backend.entity.RetailerOtp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RetailerOtpRepository extends JpaRepository<RetailerOtp, UUID> {

    Optional<RetailerOtp> findTopByPhoneOrderByCreatedAtDesc(String phone);

    void deleteByPhoneOrExpiresAtBefore(String phone, LocalDateTime cutoff);
}

