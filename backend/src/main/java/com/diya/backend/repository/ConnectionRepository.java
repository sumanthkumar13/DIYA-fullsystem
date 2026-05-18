package com.diya.backend.repository;

import com.diya.backend.entity.Connection;
import com.diya.backend.entity.Retailer;
import com.diya.backend.entity.Wholesaler;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.*;

@Repository
public interface ConnectionRepository extends JpaRepository<Connection, UUID> {

    Optional<Connection> findByWholesalerAndRetailer(Wholesaler wholesaler, Retailer retailer);

    List<Connection> findByWholesalerAndStatusOrderByRequestedAtDesc(Wholesaler wholesaler, Connection.Status status);

    List<Connection> findByWholesalerAndStatusInOrderByRequestedAtDesc(
            Wholesaler wholesaler,
            Collection<Connection.Status> statuses);

    List<Connection> findByRetailerAndStatusOrderByRequestedAtDesc(Retailer retailer, Connection.Status status);

    @Query("""
            SELECT DISTINCT c FROM Connection c
            JOIN FETCH c.wholesaler w
            LEFT JOIN FETCH w.user
            WHERE c.retailer = :retailer AND c.status = :status
            ORDER BY c.requestedAt DESC
            """)
    List<Connection> findByRetailerAndStatusWithWholesalerProfile(
            @Param("retailer") Retailer retailer,
            @Param("status") Connection.Status status);

    @Query("""
            SELECT DISTINCT c FROM Connection c
            JOIN FETCH c.wholesaler w
            LEFT JOIN FETCH w.user
            WHERE c.retailer = :retailer
            ORDER BY c.requestedAt DESC
            """)
    List<Connection> findByRetailerWithWholesalerProfile(@Param("retailer") Retailer retailer);

    List<Connection> findByWholesalerOrderByRequestedAtDesc(Wholesaler wholesaler);

    List<Connection> findByRetailerOrderByRequestedAtDesc(Retailer retailer);
}
