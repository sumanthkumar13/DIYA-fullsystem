package com.diya.backend.repository;

import com.diya.backend.entity.Invoice;
import com.diya.backend.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, UUID> {

    Optional<Invoice> findByOrderId(UUID orderId);

    List<Invoice> findByOrder(Order order);

    @Query("SELECT i FROM Invoice i WHERE i.invoiceNumber LIKE CONCAT(:prefix, '%') ORDER BY i.invoiceNumber DESC")
    List<Invoice> findByInvoiceNumberStartingWithOrderByInvoiceNumberDesc(@Param("prefix") String prefix);
}
