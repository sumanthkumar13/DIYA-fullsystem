package com.diya.backend.controller;

import com.diya.backend.dto.cart.AddToCartRequest;
import com.diya.backend.dto.cart.CartDTO;
import com.diya.backend.dto.cart.UpdateCartRequest;
import com.diya.backend.entity.Product;
import com.diya.backend.entity.Retailer;
import com.diya.backend.repository.ProductRepository;
import com.diya.backend.repository.RetailerRepository;
import com.diya.backend.service.CartService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/retailer/cart")
@RequiredArgsConstructor
public class RetailerCartController {

    private final CartService cartService;
    private final RetailerRepository retailerRepository;
    private final ProductRepository productRepository;

    /*
     * --------------------------------------------------------
     * ADD ITEM TO CART
     * --------------------------------------------------------
     */
    @PostMapping("/add")
    public CartDTO addToCart(@RequestBody AddToCartRequest req) {

        Retailer retailer = getAuthenticatedRetailer();

        Product product = productRepository.findById(req.getProductId())
                .orElseThrow(() -> new RuntimeException("Product not found"));

        UUID wholesalerId = product.getWholesaler().getId();

        cartService.addItem(
                retailer.getId(),
                wholesalerId,
                req.getProductId(),
                req.getQuantity());

        return cartService.getCart(retailer.getId(), wholesalerId);
    }

    /*
     * --------------------------------------------------------
     * UPDATE CART ITEM
     * --------------------------------------------------------
     */
    @PutMapping("/update")
    public CartDTO updateCart(@RequestBody UpdateCartRequest req) {

        Retailer retailer = getAuthenticatedRetailer();

        Product product = productRepository.findById(req.getProductId())
                .orElseThrow(() -> new RuntimeException("Product not found"));

        UUID wholesalerId = product.getWholesaler().getId();

        cartService.updateItem(
                retailer.getId(),
                wholesalerId,
                req.getProductId(),
                req.getQuantity());

        return cartService.getCart(retailer.getId(), wholesalerId);
    }

    /*
     * --------------------------------------------------------
     * REMOVE ITEM FROM CART
     * --------------------------------------------------------
     */
    @DeleteMapping("/remove/{productId}")
    public CartDTO removeFromCart(@PathVariable UUID productId) {

        Retailer retailer = getAuthenticatedRetailer();

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        UUID wholesalerId = product.getWholesaler().getId();

        cartService.removeItem(
                retailer.getId(),
                wholesalerId,
                productId);

        return cartService.getCart(retailer.getId(), wholesalerId);
    }

    /*
     * --------------------------------------------------------
     * GET CART FOR SPECIFIC WHOLESALER
     * --------------------------------------------------------
     */
    @GetMapping
    public CartDTO getCart(@RequestParam UUID wholesalerId) {

        if (wholesalerId == null) {
            throw new RuntimeException("Wholesaler ID is required");
        }

        Retailer retailer = getAuthenticatedRetailer();

        return cartService.getCart(retailer.getId(), wholesalerId);
    }

    /*
     * --------------------------------------------------------
     * AUTH HELPER
     * --------------------------------------------------------
     */
    private Retailer getAuthenticatedRetailer() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String identifier = auth.getName(); // email or phone

        return retailerRepository.findByUserEmail(identifier)
                .or(() -> retailerRepository.findByUserPhone(identifier))
                .orElseThrow(() -> new RuntimeException("Retailer not found for: " + identifier));
    }
}
