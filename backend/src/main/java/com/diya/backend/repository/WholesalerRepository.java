package com.diya.backend.repository;

import com.diya.backend.entity.Wholesaler;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WholesalerRepository extends JpaRepository<Wholesaler, UUID> {

    Optional<Wholesaler> findByHandle(String handle);

    Optional<Wholesaler> findByUserId(UUID userId);

    @Query("SELECT w FROM Wholesaler w WHERE w.user.phone = :phone")
    Optional<Wholesaler> findByUserPhone(@Param("phone") String phone);

    @Query("SELECT w FROM Wholesaler w WHERE w.user.email = :email")
    Optional<Wholesaler> findByUserEmail(@Param("email") String email);

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
