package com.diya.backend.repository;

import com.diya.backend.entity.Retailer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RetailerRepository extends JpaRepository<Retailer, UUID> {

   /**
    * Find retailer by user email
    */
   @Query("SELECT r FROM Retailer r WHERE r.user.email = :email")
   Optional<Retailer> findByUserEmail(@Param("email") String email);

   /**
    * Find retailer by user phone
    */
   @Query("SELECT r FROM Retailer r WHERE r.user.phone = :phone")
   Optional<Retailer> findByUserPhone(@Param("phone") String phone);

   /**
    * Find retailer by user id
    */
   Optional<Retailer> findByUserId(UUID userId);

   /**
    * Find retailer by phone contact
    */
   Optional<Retailer> findByPhoneContact(String phoneContact);

   /** Check duplicate GSTIN (case-insensitive handled by normalizing input). */
   boolean existsByGstNumber(String gstNumber);

   /**
    * Global retailer search (name, shop, city, state)
    */
   @Query("""
         SELECT r FROM Retailer r
         WHERE LOWER(COALESCE(r.user.name, '')) LIKE LOWER(CONCAT('%', :q, '%'))
            OR LOWER(COALESCE(r.shopName, '')) LIKE LOWER(CONCAT('%', :q, '%'))
            OR LOWER(COALESCE(r.city, '')) LIKE LOWER(CONCAT('%', :q, '%'))
            OR LOWER(COALESCE(r.state, '')) LIKE LOWER(CONCAT('%', :q, '%'))
         ORDER BY
            CASE
              WHEN LOWER(COALESCE(r.user.name, '')) = LOWER(:q) THEN 0
              WHEN LOWER(COALESCE(r.shopName, '')) = LOWER(:q) THEN 1
              ELSE 2
            END,
            LOWER(COALESCE(r.shopName, COALESCE(r.user.name, '')))
         """)
   List<Retailer> searchByFreeText(@Param("q") String q);

   /**
    * Search retailers belonging to a specific wholesaler
    * Matches retailer name, shop name, or phone contact
    */
   @Query("""
         SELECT r FROM Retailer r
         WHERE r.wholesaler.id = :wholesalerId
           AND (
                 LOWER(COALESCE(r.user.name, '')) LIKE LOWER(CONCAT('%', :q, '%'))
              OR LOWER(COALESCE(r.shopName, '')) LIKE LOWER(CONCAT('%', :q, '%'))
              OR LOWER(COALESCE(r.phoneContact, '')) LIKE LOWER(CONCAT('%', :q, '%'))
           )
         ORDER BY LOWER(COALESCE(r.shopName, COALESCE(r.user.name, '')))
         """)
   List<Retailer> searchByWholesalerAndQuery(
         @Param("wholesalerId") UUID wholesalerId,
         @Param("q") String q);
}