package com.diya.backend.repository;

import com.diya.backend.entity.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.*;

@Repository
public interface ProductRepository extends JpaRepository<Product, UUID> {

        List<Product> findByWholesalerId(UUID wholesalerId);

        Page<Product> findByWholesalerId(UUID wholesalerId, Pageable pageable);

        Page<Product> findByWholesalerIdAndCategoryId(UUID wholesalerId, UUID categoryId, Pageable pageable);

        // find last sequence for sku generation
        Optional<Product> findTopByWholesalerIdOrderBySequenceNumberDesc(UUID wholesalerId);

        // public catalog: active & visible
        Page<Product> findByVisibleToRetailerTrueAndActiveTrue(Pageable pageable);

        // search in wholesaler scope
        Page<Product> findByWholesalerIdAndNameContainingIgnoreCaseOrWholesalerIdAndSkuIgnoreCase(
                        UUID wholesalerId, String name, UUID wholesalerId2, String sku, Pageable pageable);

        Optional<Product> findBySku(String sku);

        Page<Product> findByWholesalerIdAndSubcategoryId(UUID wholesalerId, UUID subcategoryId, Pageable pageable);

        // search public catalog
        Page<Product> findByNameContainingIgnoreCaseOrSkuIgnoreCase(String name, String sku, Pageable pageable);

        Page<Product> findByCategoryId(UUID categoryId, Pageable pageable);

        // Retailer filters
        Page<Product> findByCategoryIdAndSubcategoryIdAndVisibleToRetailerTrueAndActiveTrue(UUID categoryId,
                        UUID subcategoryId, Pageable pageable);

        Page<Product> findByCategoryIdAndVisibleToRetailerTrueAndActiveTrue(UUID categoryId, Pageable pageable);

        Page<Product> findByNameContainingIgnoreCaseOrSkuIgnoreCaseAndVisibleToRetailerTrueAndActiveTrue(String name,
                        String sku, Pageable pageable);

        Page<Product> findByWholesalerIdAndVisibleToRetailerTrueAndActiveTrue(UUID wholesalerId, Pageable pageable);

        Page<Product> findByWholesalerIdAndCategoryIdAndVisibleToRetailerTrueAndActiveTrue(UUID wholesalerId,
                        UUID categoryId, Pageable pageable);

        Page<Product> findByWholesalerIdAndSubcategoryIdAndVisibleToRetailerTrueAndActiveTrue(UUID wholesalerId,
                        UUID subcategoryId, Pageable pageable);

        Page<Product> findByWholesalerIdAndNameContainingIgnoreCaseAndVisibleToRetailerTrueAndActiveTrue(
                        UUID wholesalerId, String search, Pageable pageable);

}
