package com.diya.backend.repository;

import com.diya.backend.entity.OrderItem;
import com.diya.backend.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface OrderItemRepository extends JpaRepository<OrderItem, UUID> {

    // ✅ Fetch all items of a specific order
    List<OrderItem> findByOrder(Order order);
}
