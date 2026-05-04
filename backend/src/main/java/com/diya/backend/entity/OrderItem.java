package com.diya.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "order_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    // product can be null in future if wholesaler deletes it
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id")
    private Product product;

    // SNAPSHOT fields (these must never change after order is placed)
    @Column(nullable = false)
    private UUID productIdSnapshot;

    @Column(nullable = false)
    private String productNameSnapshot;

    @Column(nullable = false)
    private String unitSnapshot;

    @Column(nullable = false)
    private Integer qty;

    // edit history (nullable; captured only on first edit)
    private Integer originalQty;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal unitPriceSnapshot;

    // edit history (nullable; captured only on first edit)
    @Column(precision = 19, scale = 2)
    private BigDecimal originalUnitPrice;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal lineTotal;

    // edit history (nullable; captured only on first edit)
    @Column(precision = 19, scale = 2)
    private BigDecimal originalLineTotal;
}
