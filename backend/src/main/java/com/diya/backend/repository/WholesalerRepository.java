package com.diya.backend.repository;

import com.diya.backend.entity.Wholesaler;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WholesalerRepository extends JpaRepository<Wholesaler, UUID> {

    Optional<Wholesaler> findByHandle(String handle);

    Optional<Wholesaler> findByUserId(UUID userId);

    Optional<Wholesaler> findByUserPhone(String phone);

    // restore old convenience method used across services
    Optional<Wholesaler> findByUserEmail(String email);

    boolean existsByHandle(String handle);

    boolean existsByUserId(UUID userId);

    List<Wholesaler> findByCity(String city);

    List<Wholesaler> findByPincode(String pincode);

    List<Wholesaler> findByBusinessNameContainingIgnoreCase(String businessName);

    List<Wholesaler> findByHandleContainingIgnoreCase(String handle);

    /*
     * -----------------------------------------------------------
     * ✅ INVITE CODE (Unique ID) - NEW
     * -----------------------------------------------------------
     */
    boolean existsByInviteCode(String inviteCode);

    Optional<Wholesaler> findByInviteCode(String inviteCode);
}
