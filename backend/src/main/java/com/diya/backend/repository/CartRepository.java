package com.diya.backend.repository;

import com.diya.backend.entity.Cart;
import com.diya.backend.entity.Retailer;
import com.diya.backend.entity.Wholesaler;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CartRepository extends JpaRepository<Cart, UUID> {
    Optional<Cart> findByRetailerAndWholesaler(Retailer retailer, Wholesaler wholesaler);
}
