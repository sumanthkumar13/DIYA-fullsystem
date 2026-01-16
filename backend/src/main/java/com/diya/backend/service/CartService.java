package com.diya.backend.service;

import com.diya.backend.dto.cart.CartDTO;
import com.diya.backend.dto.cart.CartItemDTO;
import com.diya.backend.entity.*;
import com.diya.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CartService {

    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final ProductRepository productRepository;
    private final RetailerRepository retailerRepository;
    private final WholesalerRepository wholesalerRepository;

    /*
     * ---------------------------------------------------------
     * FIXED: Correct entity loading before findByRetailerAndWholesaler()
     * ---------------------------------------------------------
     */
    @Transactional
    public Cart getOrCreateCart(UUID retailerId, UUID wholesalerId) {

        Retailer retailer = retailerRepository.findById(retailerId)
                .orElseThrow(() -> new RuntimeException("Retailer not found"));

        Wholesaler wholesaler = wholesalerRepository.findById(wholesalerId)
                .orElseThrow(() -> new RuntimeException("Wholesaler not found"));

        return cartRepository.findByRetailerAndWholesaler(retailer, wholesaler)
                .orElseGet(() -> {
                    Cart cart = Cart.builder()
                            .retailer(retailer)
                            .wholesaler(wholesaler)
                            .build();
                    return cartRepository.save(cart);
                });
    }

    /*
     * ---------------------------------------------------------
     * ADD ITEM
     * ---------------------------------------------------------
     */
    @Transactional
    public Cart addItem(UUID retailerId, UUID wholesalerId, UUID productId, int qty) {

        Cart cart = getOrCreateCart(retailerId, wholesalerId);

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        if (!product.getWholesaler().getId().equals(wholesalerId)) {
            throw new RuntimeException("Product does not belong to this wholesaler");
        }

        Optional<CartItem> existingItem = cart.getItems().stream()
                .filter(item -> item.getProduct().getId().equals(productId))
                .findFirst();

        if (existingItem.isPresent()) {
            CartItem item = existingItem.get();
            item.setQuantity(item.getQuantity() + qty);
            item.setPriceAtTime(product.getPrice());
            item.setMrpAtTime(product.getMrp());
            item.setStockSnapshot(product.getStock());
        } else {
            CartItem newItem = CartItem.builder()
                    .cart(cart)
                    .product(product)
                    .quantity(qty)
                    .priceAtTime(product.getPrice())
                    .mrpAtTime(product.getMrp())
                    .stockSnapshot(product.getStock())
                    .build();
            cart.getItems().add(newItem);
        }

        return cartRepository.save(cart);
    }

    /*
     * ---------------------------------------------------------
     * UPDATE ITEM
     * ---------------------------------------------------------
     */
    @Transactional
    public Cart updateItem(UUID retailerId, UUID wholesalerId, UUID productId, int qty) {

        Cart cart = getOrCreateCart(retailerId, wholesalerId);

        if (qty <= 0) {
            return removeItem(retailerId, wholesalerId, productId);
        }

        CartItem item = cart.getItems().stream()
                .filter(i -> i.getProduct().getId().equals(productId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Item not found in cart"));

        item.setQuantity(qty);
        item.setPriceAtTime(item.getProduct().getPrice());
        item.setMrpAtTime(item.getProduct().getMrp());
        item.setStockSnapshot(item.getProduct().getStock());

        return cartRepository.save(cart);
    }

    /*
     * ---------------------------------------------------------
     * REMOVE ITEM
     * ---------------------------------------------------------
     */
    @Transactional
    public Cart removeItem(UUID retailerId, UUID wholesalerId, UUID productId) {

        Cart cart = getOrCreateCart(retailerId, wholesalerId);

        cart.getItems().removeIf(item -> item.getProduct().getId().equals(productId));

        return cartRepository.save(cart);
    }

    /*
     * ---------------------------------------------------------
     * GET CART
     * ---------------------------------------------------------
     */
    public CartDTO getCart(UUID retailerId, UUID wholesalerId) {
        Cart cart = getOrCreateCart(retailerId, wholesalerId);
        return toDto(cart);
    }

    /*
     * ---------------------------------------------------------
     * CONVERT CART → DTO
     * ---------------------------------------------------------
     */
    private CartDTO toDto(Cart cart) {

        double totalAmount = cart.getItems().stream()
                .mapToDouble(item -> item.getPriceAtTime() * item.getQuantity())
                .sum();

        return CartDTO.builder()
                .id(cart.getId())
                .wholesalerId(cart.getWholesaler().getId())
                .wholesalerName(cart.getWholesaler().getBusinessName())
                .items(cart.getItems().stream().map(this::toItemDto).collect(Collectors.toList()))
                .totalAmount(totalAmount)
                .totalItems(cart.getItems().stream().mapToInt(CartItem::getQuantity).sum())
                .build();
    }

    private CartItemDTO toItemDto(CartItem item) {
        return CartItemDTO.builder()
                .id(item.getId())
                .productId(item.getProduct().getId())
                .productName(item.getProduct().getName())
                .productSku(item.getProduct().getSku())
                .productImageUrl(item.getProduct().getImageUrl())
                .quantity(item.getQuantity())
                .price(item.getPriceAtTime())
                .mrp(item.getMrpAtTime())
                .total(item.getPriceAtTime() * item.getQuantity())
                .status(computeStatus(item.getProduct().getStock()))
                .build();
    }

    private String computeStatus(Integer stock) {
        if (stock == null || stock <= 0)
            return "Out of Stock";
        if (stock < 20)
            return "Low Stock";
        return "In Stock";
    }
}
