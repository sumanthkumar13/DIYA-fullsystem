package com.diya.backend.repository;

import com.diya.backend.entity.Payment;
import com.diya.backend.entity.Order;
import com.diya.backend.entity.Wholesaler;
import com.diya.backend.entity.Retailer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, UUID> {

    List<Payment> findByOrder(Order order);

    List<Payment> findByWholesaler(Wholesaler wholesaler);

    List<Payment> findByWholesalerAndRetailer(Wholesaler wholesaler, Retailer retailer);

    List<Payment> findByWholesalerAndRetailerAndReferenceIgnoreCase(Wholesaler wholesaler, Retailer retailer, String reference);

    // ✅ new
    List<Payment> findByWholesalerAndStatus(Wholesaler wholesaler, Payment.PaymentStatus status);

    List<Payment> findByRetailerOrderByCreatedAtDesc(Retailer retailer);

    @Query("SELECT p FROM Payment p LEFT JOIN FETCH p.order o WHERE p.retailer = :retailer ORDER BY p.createdAt DESC")
    List<Payment> findByRetailerWithOrderOrderByCreatedAtDesc(@Param("retailer") Retailer retailer);
}
