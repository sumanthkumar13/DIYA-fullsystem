package com.diya.backend.controller;

import com.diya.backend.dto.product.ProductDetailDTO;
import com.diya.backend.dto.product.ProductResponseDTO;
import com.diya.backend.service.ProductService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/retailer/products")
@RequiredArgsConstructor
public class RetailerProductController {

    private final ProductService productService;

    // ✅ product detail - gated by wholesaler connection
    @GetMapping("/{productId}")
    public ProductDetailDTO getProduct(
            @PathVariable UUID productId,
            @RequestParam UUID wholesalerId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String identifier = auth.getName();

        return productService.getRetailerProductDetail(identifier, productId, wholesalerId);
    }

    // ✅ wholesaler catalog list - gated by wholesaler connection
    @GetMapping
    public Page<ProductResponseDTO> getProducts(
            @RequestParam UUID wholesalerId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) UUID categoryId,
            @RequestParam(required = false) UUID subcategoryId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String identifier = auth.getName();

        return productService.listRetailerProducts(identifier, wholesalerId, search, categoryId, subcategoryId, page,
                size);
    }
}
