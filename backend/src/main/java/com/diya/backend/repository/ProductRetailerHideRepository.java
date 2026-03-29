package com.diya.backend.repository;

import com.diya.backend.entity.ProductRetailerHide;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ProductRetailerHideRepository extends JpaRepository<ProductRetailerHide, UUID> {

    void deleteByProduct_Id(UUID productId);

    List<ProductRetailerHide> findByProduct_Id(UUID productId);

    boolean existsByProduct_IdAndRetailer_Id(UUID productId, UUID retailerId);
}
