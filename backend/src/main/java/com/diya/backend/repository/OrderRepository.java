package com.diya.backend.repository;

import com.diya.backend.entity.Order;
import com.diya.backend.entity.Retailer;
import com.diya.backend.entity.Wholesaler;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;
import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, UUID> {

    Page<Order> findByWholesaler(Wholesaler wholesaler, Pageable pageable);

    List<Order> findByWholesaler(Wholesaler wholesaler);

    List<Order> findByRetailer(Retailer retailer);

    Page<Order> findByWholesalerAndStatus(Wholesaler wholesaler, Order.Status status, Pageable pageable);

    // ✅ helpful additions
    List<Order> findByWholesalerAndStatus(Wholesaler wholesaler, Order.Status status);

    Optional<Order> findByOrderNumber(String orderNumber);
}
