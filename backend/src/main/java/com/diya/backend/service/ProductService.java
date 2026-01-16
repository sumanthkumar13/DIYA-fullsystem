package com.diya.backend.service;

import com.diya.backend.dto.product.*;
import com.diya.backend.entity.*;
import com.diya.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.*;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final WholesalerRepository wholesalerRepository;
    private final CategoryRepository categoryRepository;
    private final SubCategoryRepository subCategoryRepository;
    private static final int DEFAULT_LOW_STOCK_THRESHOLD = 20;
    private final RetailerRepository retailerRepository;
    private final ConnectionService connectionService;

    @Transactional
    public ProductResponseDTO createProduct(String identifier, String authType, ProductCreateRequest req) {
        Wholesaler wholesaler = resolveWholesaler(identifier, authType);

        Category category = categoryRepository.findById(req.getCategoryId())
                .orElseThrow(() -> new RuntimeException("Category not found"));

        if (!category.getWholesaler().getId().equals(wholesaler.getId())) {
            throw new RuntimeException("Category does not belong to this wholesaler");
        }

        SubCategory sub = null;
        if (req.getSubcategoryId() != null) {
            sub = subCategoryRepository.findById(req.getSubcategoryId())
                    .orElseThrow(() -> new RuntimeException("Subcategory not found"));
            if (!sub.getCategory().getId().equals(category.getId())) {
                throw new RuntimeException("Subcategory not under provided category");
            }
        }

        // compute next sequence (simple transactional approach)
        Optional<Product> last = productRepository.findTopByWholesalerIdOrderBySequenceNumberDesc(wholesaler.getId());
        int nextSeq = last.map(p -> p.getSequenceNumber() == null ? 1 : p.getSequenceNumber() + 1).orElse(1);
        String sku = generateSku(nextSeq);

        Product product = Product.builder()
                .wholesaler(wholesaler)
                .category(category)
                .subcategory(sub)
                .sequenceNumber(nextSeq)
                .sku(sku)
                .name(req.getName())
                .description(req.getDescription())
                .unit(req.getUnit())
                .price(req.getPrice())
                .mrp(req.getMrp())
                .stock(req.getStock() == null ? 0 : req.getStock())
                .imageUrl(req.getImageUrl())
                .active(true)
                .visibleToRetailer(req.getVisibleToRetailer() == null ? true : req.getVisibleToRetailer())
                .build();

        product = productRepository.save(product);
        return toDto(product);
    }

    public ProductDetailDTO getRetailerProductDetail(String identifier, UUID productId, UUID wholesalerId) {

        Retailer retailer = identifier.contains("@")
                ? retailerRepository.findByUserEmail(identifier)
                        .orElseThrow(() -> new RuntimeException("Retailer not found"))
                : retailerRepository.findByUserPhone(identifier)
                        .orElseThrow(() -> new RuntimeException("Retailer not found"));

        Wholesaler wholesaler = wholesalerRepository.findById(wholesalerId)
                .orElseThrow(() -> new RuntimeException("Wholesaler not found"));

        // ✅ gatekeeping
        connectionService.ensureRetailerConnectedToWholesaler(retailer, wholesaler);

        Product p = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        // ✅ ensure product belongs to this wholesaler
        if (!p.getWholesaler().getId().equals(wholesaler.getId())) {
            throw new RuntimeException("Product does not belong to this wholesaler");
        }

        if (!p.isActive() || !p.isVisibleToRetailer()) {
            throw new RuntimeException("Product not available");
        }

        UUID subId = p.getSubcategory() == null ? null : p.getSubcategory().getId();
        String subName = p.getSubcategory() == null ? null : p.getSubcategory().getName();

        return ProductDetailDTO.builder()
                .id(p.getId())
                .sku(p.getSku())
                .name(p.getName())
                .description(p.getDescription())
                .unit(p.getUnit())
                .price(p.getPrice())
                .mrp(p.getMrp())
                .stock(getAvailableStock(p)) // ✅ use available stock not raw stock
                .status(getStatus(getAvailableStock(p)))
                .imageUrl(p.getImageUrl())
                .categoryId(p.getCategory().getId())
                .categoryName(p.getCategory().getName())
                .subcategoryId(subId)
                .subcategoryName(subName)
                .visibleToRetailer(p.isVisibleToRetailer())
                .wholesalerName(p.getWholesaler().getBusinessName())
                .wholesalerCity(p.getWholesaler().getCity())
                .build();
    }

    public Page<ProductResponseDTO> listRetailerProducts(
            String identifier,
            UUID wholesalerId,
            String search,
            UUID categoryId,
            UUID subcategoryId,
            int page,
            int size) {
        Retailer retailer = identifier.contains("@")
                ? retailerRepository.findByUserEmail(identifier)
                        .orElseThrow(() -> new RuntimeException("Retailer not found"))
                : retailerRepository.findByUserPhone(identifier)
                        .orElseThrow(() -> new RuntimeException("Retailer not found"));

        Wholesaler wholesaler = wholesalerRepository.findById(wholesalerId)
                .orElseThrow(() -> new RuntimeException("Wholesaler not found"));

        // ✅ gatekeeping
        connectionService.ensureRetailerConnectedToWholesaler(retailer, wholesaler);

        Pageable pageable = PageRequest.of(page, size);

        Page<Product> productsPage;

        // 🔥 Most important filter: wholesalerId must match + visibleToRetailer +
        // active
        if (subcategoryId != null) {
            productsPage = productRepository
                    .findByWholesalerIdAndSubcategoryIdAndVisibleToRetailerTrueAndActiveTrue(
                            wholesaler.getId(), subcategoryId, pageable);
        } else if (categoryId != null) {
            productsPage = productRepository
                    .findByWholesalerIdAndCategoryIdAndVisibleToRetailerTrueAndActiveTrue(
                            wholesaler.getId(), categoryId, pageable);
        } else if (search != null && !search.isBlank()) {
            productsPage = productRepository
                    .findByWholesalerIdAndNameContainingIgnoreCaseAndVisibleToRetailerTrueAndActiveTrue(
                            wholesaler.getId(), search, pageable);
        } else {
            productsPage = productRepository
                    .findByWholesalerIdAndVisibleToRetailerTrueAndActiveTrue(wholesaler.getId(), pageable);
        }

        return productsPage.map(this::toDto);
    }

    public ProductResponseDTO getProductForWholesaler(String identifier, String authType, UUID id) {
        Wholesaler wholesaler = resolveWholesaler(identifier, authType);
        Product p = productRepository.findById(id).orElseThrow(() -> new RuntimeException("Product not found"));
        if (!p.getWholesaler().getId().equals(wholesaler.getId()))
            throw new RuntimeException("Access denied");
        return toDto(p);
    }

    @Transactional
    public ProductResponseDTO updateProduct(String identifier, String authType, UUID productId,
            ProductUpdateRequest req) {
        Wholesaler wholesaler = resolveWholesaler(identifier, authType);
        Product p = productRepository.findById(productId).orElseThrow(() -> new RuntimeException("Product not found"));
        if (!p.getWholesaler().getId().equals(wholesaler.getId()))
            throw new RuntimeException("Access denied");

        if (req.getCategoryId() != null) {
            Category cat = categoryRepository.findById(req.getCategoryId())
                    .orElseThrow(() -> new RuntimeException("Category not found"));
            if (!cat.getWholesaler().getId().equals(wholesaler.getId()))
                throw new RuntimeException("Category mismatch");
            p.setCategory(cat);
        }

        if (req.getSubcategoryId() != null) {
            SubCategory sub = subCategoryRepository.findById(req.getSubcategoryId())
                    .orElseThrow(() -> new RuntimeException("Subcategory not found"));
            p.setSubcategory(sub);
        }

        if (req.getName() != null)
            p.setName(req.getName());
        if (req.getDescription() != null)
            p.setDescription(req.getDescription());
        if (req.getUnit() != null)
            p.setUnit(req.getUnit());
        if (req.getPrice() != null)
            p.setPrice(req.getPrice());
        if (req.getMrp() != null)
            p.setMrp(req.getMrp());
        if (req.getStock() != null)
            p.setStock(req.getStock());
        if (req.getImageUrl() != null)
            p.setImageUrl(req.getImageUrl());
        if (req.getActive() != null)
            p.setActive(req.getActive());
        if (req.getVisibleToRetailer() != null)
            p.setVisibleToRetailer(req.getVisibleToRetailer());

        p = productRepository.save(p);
        return toDto(p);
    }

    /**
     * Wholesaler product listing with pagination, optional search,
     * category/subcategory filter.
     */
    public Page<ProductResponseDTO> listProductsForWholesaler(
            String identifier, String authType, int page, int size, String search, UUID categoryId,
            UUID subcategoryId) {

        Wholesaler wholesaler = resolveWholesaler(identifier, authType);
        Pageable pageable = PageRequest.of(page, size);

        Page<Product> productsPage;

        // ✅ FIX: if subcategoryId is present, use it (needed for showing products under
        // subcategory)
        if (subcategoryId != null) {
            productsPage = productRepository.findByWholesalerIdAndSubcategoryId(
                    wholesaler.getId(), subcategoryId, pageable);
        } else if (categoryId != null) {
            productsPage = productRepository.findByWholesalerIdAndCategoryId(
                    wholesaler.getId(), categoryId, pageable);
        } else if (search != null && !search.isBlank()) {
            productsPage = productRepository
                    .findByWholesalerIdAndNameContainingIgnoreCaseOrWholesalerIdAndSkuIgnoreCase(
                            wholesaler.getId(), search, wholesaler.getId(), search, pageable);
        } else {
            productsPage = productRepository.findByWholesalerId(wholesaler.getId(), pageable);
        }

        return productsPage.map(this::toDto);
    }

    /**
     * Public catalog (retailer-facing) — only active && visibleToRetailer
     */
    public Page<ProductResponseDTO> publicCatalog(String q, int page, int size, UUID categoryId) {
        Pageable pageable = PageRequest.of(page, size);

        Page<Product> pageRes;
        if (categoryId != null) {
            pageRes = productRepository.findByCategoryId(categoryId, pageable).map(p -> p);
        } else if (q != null && !q.isBlank()) {
            pageRes = productRepository.findByNameContainingIgnoreCaseOrSkuIgnoreCase(q, q, pageable);
        } else {
            pageRes = productRepository.findByVisibleToRetailerTrueAndActiveTrue(pageable);
        }

        return pageRes.map(this::toDto);
    }

    public ProductResponseDTO getBySkuForRetailer(String sku) {
        Product p = productRepository.findBySku(sku)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        if (!p.isActive() || !p.isVisibleToRetailer()) {
            throw new RuntimeException("Product not available");
        }
        return toDto(p);
    }

    public ProductDetailDTO getProductDetail(UUID productId) {
        Product p = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        if (!p.isVisibleToRetailer()) {
            throw new RuntimeException("Product not available");
        }

        // ✅ FIX: avoid NullPointerException if subcategory is null
        UUID subId = p.getSubcategory() == null ? null : p.getSubcategory().getId();
        String subName = p.getSubcategory() == null ? null : p.getSubcategory().getName();

        return ProductDetailDTO.builder()
                .id(p.getId())
                .sku(p.getSku())
                .name(p.getName())
                .description(p.getDescription())
                .unit(p.getUnit())
                .price(p.getPrice())
                .mrp(p.getMrp())
                .stock(p.getStock())
                .status(getStatus(p.getStock()))
                .imageUrl(p.getImageUrl())
                .categoryId(p.getCategory().getId())
                .categoryName(p.getCategory().getName())
                .subcategoryId(subId)
                .subcategoryName(subName)
                .visibleToRetailer(p.isVisibleToRetailer())
                .wholesalerName(p.getWholesaler().getBusinessName())
                .wholesalerCity(p.getWholesaler().getCity())
                .build();
    }

    public Page<ProductResponseDTO> listRetailerProducts(String search, UUID categoryId, UUID subcategoryId, int page,
            int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Product> productsPage;

        if (categoryId != null && subcategoryId != null) {
            productsPage = productRepository.findByCategoryIdAndSubcategoryIdAndVisibleToRetailerTrueAndActiveTrue(
                    categoryId, subcategoryId, pageable);
        } else if (categoryId != null) {
            productsPage = productRepository.findByCategoryIdAndVisibleToRetailerTrueAndActiveTrue(categoryId,
                    pageable);
        } else if (search != null && !search.isBlank()) {
            productsPage = productRepository
                    .findByNameContainingIgnoreCaseOrSkuIgnoreCaseAndVisibleToRetailerTrueAndActiveTrue(search, search,
                            pageable);
        } else {
            productsPage = productRepository.findByVisibleToRetailerTrueAndActiveTrue(pageable);
        }

        return productsPage.map(this::toDto);
    }

    private String getStatus(Integer stock) {
        if (stock == null)
            return "Unknown";
        if (stock == 0)
            return "Out of Stock";
        if (stock < 20)
            return "Low Stock";
        return "In Stock";
    }

    /* ------------------------ HELPERS ------------------------ */

    private ProductResponseDTO toDto(Product p) {
        String status = computeStatus(p.getStock(), DEFAULT_LOW_STOCK_THRESHOLD);
        return ProductResponseDTO.builder()
                .id(p.getId())
                .sku(p.getSku())
                .sequenceNumber(p.getSequenceNumber())
                .name(p.getName())
                .description(p.getDescription())
                .unit(p.getUnit())
                .price(p.getPrice())
                .mrp(p.getMrp())
                .stock(p.getStock())
                .status(status)
                .imageUrl(p.getImageUrl())
                .categoryId(p.getCategory() == null ? null : p.getCategory().getId())
                .categoryName(p.getCategory() == null ? null : p.getCategory().getName())
                .subcategoryId(p.getSubcategory() == null ? null : p.getSubcategory().getId())
                .subcategoryName(p.getSubcategory() == null ? null : p.getSubcategory().getName())
                .isActive(p.isActive())
                .visibleToRetailer(p.isVisibleToRetailer())
                .build();
    }

    private String computeStatus(Integer stock, int lowThreshold) {
        if (stock == null || stock <= 0)
            return "Out of Stock";
        if (stock < lowThreshold)
            return "Low Stock";
        return "In Stock";
    }

    private String generateSku(int seq) {
        return "P" + String.format("%03d", seq);
    }

    private Wholesaler resolveWholesaler(String identifier, String authType) {
        if ("EMAIL".equalsIgnoreCase(authType)) {
            return wholesalerRepository.findByUserEmail(identifier)
                    .orElseThrow(() -> new RuntimeException("Wholesaler not found"));
        } else {
            return wholesalerRepository.findByUserPhone(identifier)
                    .orElseThrow(() -> new RuntimeException("Wholesaler not found"));
        }
    }

    private int getAvailableStock(Product p) {
        int stock = p.getStock() == null ? 0 : p.getStock();
        int reserved = p.getReservedStock() == null ? 0 : p.getReservedStock();
        return stock - reserved;
    }
}
