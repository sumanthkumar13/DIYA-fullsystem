package com.diya.backend.repository;

import com.diya.backend.entity.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.*;

@Repository
public interface ProductRepository extends JpaRepository<Product, UUID> {

        List<Product> findByWholesalerId(UUID wholesalerId);

        List<Product> findByWholesalerIdAndCategoryIdAndSubcategoryIsNull(UUID wholesalerId, UUID categoryId);

        List<Product> findByWholesalerIdAndSubcategoryId(UUID wholesalerId, UUID subcategoryId);

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

        /* Wholesaler catalog (non-deleted) */
        Page<Product> findByWholesalerIdAndDeletedFalse(UUID wholesalerId, Pageable pageable);

        Page<Product> findByWholesalerIdAndSubcategoryIdAndDeletedFalse(UUID wholesalerId, UUID subcategoryId,
                        Pageable pageable);

        Page<Product> findByWholesalerIdAndCategoryIdAndDeletedFalse(UUID wholesalerId, UUID categoryId,
                        Pageable pageable);

        Page<Product> findByWholesalerIdAndCategoryIdAndSubcategoryIsNullAndDeletedFalse(
                        UUID wholesalerId, UUID categoryId, Pageable pageable);

        boolean existsByWholesalerIdAndCategoryIdAndDeletedFalse(UUID wholesalerId, UUID categoryId);

        boolean existsByWholesalerIdAndSubcategoryIdAndDeletedFalse(UUID wholesalerId, UUID subcategoryId);

        /** Used for safe deletion of subcategory/category (FK exists regardless of deleted flag). */
        boolean existsByWholesalerIdAndSubcategoryId(UUID wholesalerId, UUID subcategoryId);

        long countByWholesalerIdAndSubcategoryId(UUID wholesalerId, UUID subcategoryId);

        long countByWholesalerIdAndSubcategoryIdAndDeletedFalse(UUID wholesalerId, UUID subcategoryId);

        @Modifying
        @Query("""
                        UPDATE Product p SET p.subcategory = null
                        WHERE p.wholesaler.id = :wid AND p.subcategory.id = :sid AND p.deleted = true
                        """)
        int detachDeletedProductsFromSubcategory(@Param("wid") UUID wholesalerId, @Param("sid") UUID subcategoryId);

        @Query("""
                        SELECT p FROM Product p WHERE p.wholesaler.id = :wid AND p.deleted = false
                        AND (LOWER(p.name) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(p.sku) LIKE LOWER(CONCAT('%', :q, '%')))
                        """)
        Page<Product> searchByWholesalerDeletedFalse(@Param("wid") UUID wholesalerId, @Param("q") String q,
                        Pageable pageable);

        /* Retailer catalog: visible, active, not deleted, not hidden for retailer */
        @Query("""
                        SELECT p FROM Product p WHERE p.wholesaler.id = :wid AND p.visibleToRetailer = true
                        AND p.active = true AND p.deleted = false
                        AND NOT EXISTS (SELECT 1 FROM ProductRetailerHide h WHERE h.product.id = p.id AND h.retailer.id = :rid)
                        """)
        Page<Product> findRetailerCatalogAll(@Param("wid") UUID wholesalerId, @Param("rid") UUID retailerId,
                        Pageable pageable);

        @Query("""
                        SELECT p FROM Product p WHERE p.wholesaler.id = :wid AND p.category.id = :cid
                        AND p.visibleToRetailer = true AND p.active = true AND p.deleted = false
                        AND NOT EXISTS (SELECT 1 FROM ProductRetailerHide h WHERE h.product.id = p.id AND h.retailer.id = :rid)
                        """)
        Page<Product> findRetailerCatalogByCategory(@Param("wid") UUID wholesalerId, @Param("cid") UUID categoryId,
                        @Param("rid") UUID retailerId, Pageable pageable);

        @Query("""
                        SELECT p FROM Product p WHERE p.wholesaler.id = :wid AND p.subcategory.id = :sid
                        AND p.visibleToRetailer = true AND p.active = true AND p.deleted = false
                        AND NOT EXISTS (SELECT 1 FROM ProductRetailerHide h WHERE h.product.id = p.id AND h.retailer.id = :rid)
                        """)
        Page<Product> findRetailerCatalogBySubcategory(@Param("wid") UUID wholesalerId, @Param("sid") UUID subcategoryId,
                        @Param("rid") UUID retailerId, Pageable pageable);

        @Query("""
                        SELECT p FROM Product p WHERE p.wholesaler.id = :wid AND p.visibleToRetailer = true
                        AND p.active = true AND p.deleted = false
                        AND NOT EXISTS (SELECT 1 FROM ProductRetailerHide h WHERE h.product.id = p.id AND h.retailer.id = :rid)
                        AND LOWER(p.name) LIKE LOWER(CONCAT('%', :q, '%'))
                        """)
        Page<Product> findRetailerCatalogSearch(@Param("wid") UUID wholesalerId, @Param("rid") UUID retailerId,
                        @Param("q") String q, Pageable pageable);
}
