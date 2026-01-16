package com.diya.backend.repository;

import com.diya.backend.entity.Payment;
import com.diya.backend.entity.Order;
import com.diya.backend.entity.Wholesaler;
import com.diya.backend.entity.Retailer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, UUID> {

    List<Payment> findByOrder(Order order);

    List<Payment> findByWholesaler(Wholesaler wholesaler);

    List<Payment> findByWholesalerAndRetailer(Wholesaler wholesaler, Retailer retailer);

    // ✅ new
    List<Payment> findByWholesalerAndStatus(Wholesaler wholesaler, Payment.PaymentStatus status);
}
