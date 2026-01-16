package com.diya.backend.repository;

import com.diya.backend.entity.Retailer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface RetailerRepository extends JpaRepository<Retailer, UUID> {

    Optional<Retailer> findByUserEmail(String email);

    Optional<Retailer> findByUserPhone(String phone);

    Optional<Retailer> findByUserId(UUID userId);
}
