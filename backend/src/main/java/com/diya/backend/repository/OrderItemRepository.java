package com.diya.backend.repository;

import com.diya.backend.entity.OrderItem;
import com.diya.backend.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface OrderItemRepository extends JpaRepository<OrderItem, UUID> {

    // ✅ Fetch all items of a specific order
    List<OrderItem> findByOrder(Order order);

    @Query("""
            select
              oi.productIdSnapshot,
              oi.productNameSnapshot,
              coalesce(sum(oi.qty), 0),
              coalesce(sum(oi.lineTotal), 0)
            from OrderItem oi
              join oi.order o
            where o.wholesaler = :wholesaler
              and o.placedAt >= :from
              and o.placedAt < :to
              and o.status not in (com.diya.backend.entity.Order.Status.REJECTED, com.diya.backend.entity.Order.Status.CANCELLED)
            group by oi.productIdSnapshot, oi.productNameSnapshot
            order by coalesce(sum(oi.qty), 0) desc
            """)
    List<Object[]> topProductsForWholesalerBetween(
            @Param("wholesaler") com.diya.backend.entity.Wholesaler wholesaler,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);

    @Query("""
            select
              oi.productIdSnapshot,
              max(coalesce(o.acceptedAt, o.placedAt))
            from OrderItem oi
              join oi.order o
            where o.wholesaler = :wholesaler
              and o.status not in (com.diya.backend.entity.Order.Status.REJECTED, com.diya.backend.entity.Order.Status.CANCELLED)
            group by oi.productIdSnapshot
            """)
    List<Object[]> lastSoldAtByProductForWholesaler(
            @Param("wholesaler") com.diya.backend.entity.Wholesaler wholesaler);
}
