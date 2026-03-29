package com.diya.backend.controller;

import com.diya.backend.dto.product.*;
import com.diya.backend.service.ProductService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.Page;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/wholesaler/products")
@RequiredArgsConstructor
public class WholesalerProductController {

    private final ProductService productService;

    private String getIdentifier(Authentication auth) { return auth.getName(); }
    private String getAuthType(Authentication auth) { return auth.getName().contains("@") ? "EMAIL" : "PHONE"; }

    @PostMapping
    public ProductResponseDTO create(@RequestBody ProductCreateRequest req) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return productService.createProduct(getIdentifier(auth), getAuthType(auth), req);
    }

    @GetMapping
    public Page<ProductResponseDTO> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) UUID categoryId,
            @RequestParam(required = false) UUID subcategoryId
    ) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return productService.listProductsForWholesaler(getIdentifier(auth), getAuthType(auth), page, size, search, categoryId, subcategoryId);
    }

    @GetMapping("/{id}")
    public ProductResponseDTO get(@PathVariable UUID id) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return productService.getProductForWholesaler(getIdentifier(auth), getAuthType(auth), id);
    }

    @PutMapping("/{id}")
    public ProductResponseDTO update(@PathVariable UUID id, @RequestBody ProductUpdateRequest req) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return productService.updateProduct(getIdentifier(auth), getAuthType(auth), id, req);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        productService.deleteProductForWholesaler(getIdentifier(auth), getAuthType(auth), id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/retailer-visibility")
    public List<ProductRetailerVisibilityRowDTO> getRetailerVisibility(@PathVariable UUID id) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return productService.getProductRetailerVisibility(getIdentifier(auth), getAuthType(auth), id);
    }

    @PutMapping("/{id}/retailer-visibility")
    public ResponseEntity<Void> setRetailerVisibility(
            @PathVariable UUID id, @RequestBody ProductRetailerVisibilityUpdateRequest req) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        productService.setProductRetailerVisibility(
                getIdentifier(auth), getAuthType(auth), id,
                req.getHiddenRetailerIds() != null ? req.getHiddenRetailerIds() : List.of());
        return ResponseEntity.noContent().build();
    }
}
