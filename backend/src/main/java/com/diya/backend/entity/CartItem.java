package com.diya.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "cart_items")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class CartItem {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "cart_id", nullable = false)
    private Cart cart;

    @ManyToOne
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    private Integer quantity;

    @Column(precision = 19, scale = 2)
    private BigDecimal priceAtTime;

    @Column(precision = 19, scale = 2)
    private BigDecimal mrpAtTime;
    private Integer stockSnapshot;
}
