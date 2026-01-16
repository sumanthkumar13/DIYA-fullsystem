package com.diya.backend.repository;

import com.diya.backend.entity.Connection;
import com.diya.backend.entity.Retailer;
import com.diya.backend.entity.Wholesaler;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.*;

@Repository
public interface ConnectionRepository extends JpaRepository<Connection, UUID> {

    Optional<Connection> findByWholesalerAndRetailer(Wholesaler wholesaler, Retailer retailer);

    List<Connection> findByWholesalerAndStatusOrderByRequestedAtDesc(Wholesaler wholesaler, Connection.Status status);

    List<Connection> findByRetailerAndStatusOrderByRequestedAtDesc(Retailer retailer, Connection.Status status);

    List<Connection> findByWholesalerOrderByRequestedAtDesc(Wholesaler wholesaler);

    List<Connection> findByRetailerOrderByRequestedAtDesc(Retailer retailer);
}
