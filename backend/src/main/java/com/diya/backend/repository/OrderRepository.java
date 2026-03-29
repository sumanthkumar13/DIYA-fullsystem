package com.diya.backend.repository;

import com.diya.backend.entity.Order;
import com.diya.backend.entity.Retailer;
import com.diya.backend.entity.Wholesaler;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
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

    @Query("""
            select coalesce(sum(o.totalAmount), 0)
            from Order o
            where o.wholesaler.id = :wholesalerId
              and o.retailer.id = :retailerId
              and o.status in :doneStatuses
            """)
    BigDecimal sumCompletedOrderValueForRetailer(
            @Param("wholesalerId") UUID wholesalerId,
            @Param("retailerId") UUID retailerId,
            @Param("doneStatuses") List<Order.Status> doneStatuses);

    @Query("""
            select coalesce(sum(o.totalAmount), 0)
            from Order o
            where o.wholesaler = :wholesaler
              and o.placedAt >= :from
              and o.placedAt < :to
            """)
    BigDecimal sumTotalAmountForWholesalerBetween(
            @Param("wholesaler") Wholesaler wholesaler,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);

    @Query("""
            select count(o)
            from Order o
            where o.wholesaler = :wholesaler
              and o.placedAt >= :from
              and o.placedAt < :to
            """)
    long countOrdersForWholesalerBetween(
            @Param("wholesaler") Wholesaler wholesaler,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);

    @Query("""
            select
              sum(case when o.status in :pending then 1 else 0 end),
              sum(case when o.status = com.diya.backend.entity.Order.Status.DISPATCHED then 1 else 0 end),
              sum(case when o.status in :delivered then 1 else 0 end)
            from Order o
            where o.wholesaler = :wholesaler
            """)
    Object[] orderStatusBuckets(
            @Param("wholesaler") Wholesaler wholesaler,
            @Param("pending") List<Order.Status> pending,
            @Param("delivered") List<Order.Status> delivered);

    @Query("""
            select
              year(o.placedAt),
              month(o.placedAt),
              coalesce(sum(o.totalAmount), 0),
              count(o)
            from Order o
            where o.wholesaler = :wholesaler
              and o.placedAt >= :from
            group by year(o.placedAt), month(o.placedAt)
            order by year(o.placedAt) asc, month(o.placedAt) asc
            """)
    List<Object[]> monthlySalesSince(
            @Param("wholesaler") Wholesaler wholesaler,
            @Param("from") LocalDateTime from);

    @Query("""
            select
              o.retailer.id,
              coalesce(o.retailer.shopName, coalesce(o.retailer.user.name, 'Unknown')),
              count(o),
              coalesce(sum(o.totalAmount), 0)
            from Order o
            where o.wholesaler = :wholesaler
              and o.placedAt >= :from
              and o.placedAt < :to
              and o.status not in (com.diya.backend.entity.Order.Status.REJECTED, com.diya.backend.entity.Order.Status.CANCELLED)
            group by o.retailer.id, o.retailer.shopName, o.retailer.user.name
            order by coalesce(sum(o.totalAmount), 0) desc
            """)
    List<Object[]> topRetailersForWholesalerBetween(
            @Param("wholesaler") Wholesaler wholesaler,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);
}
