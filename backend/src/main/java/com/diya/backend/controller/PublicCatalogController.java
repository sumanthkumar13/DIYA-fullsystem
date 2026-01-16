package com.diya.backend.controller;

import com.diya.backend.dto.product.ProductResponseDTO;
import com.diya.backend.service.ProductService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.Page;

import java.util.UUID;

@RestController
@RequestMapping("/api/catalog")
@RequiredArgsConstructor
public class PublicCatalogController {

    private final ProductService productService;

    @GetMapping("/products")
    public Page<ProductResponseDTO> catalog(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) UUID categoryId
    ) {
        return productService.publicCatalog(q, page, size, categoryId);
    }

    // Optional: search by sku exact
    @GetMapping("/products/by-sku/{sku}")
    public ProductResponseDTO bySku(@PathVariable String sku) {
        // implement a productService.getBySkuForRetailer that checks visible & active
        ProductResponseDTO dto = productService.getBySkuForRetailer(sku);
        return dto;
    }
}
