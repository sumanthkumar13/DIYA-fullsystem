package com.diya.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

/**
 * When a row exists, the retailer cannot see this product in catalog
 * (even if visibleToRetailer is true).
 */
@Entity
@Table(name = "product_retailer_hide", uniqueConstraints = {
        @UniqueConstraint(columnNames = { "product_id", "retailer_id" })
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductRetailerHide {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "retailer_id", nullable = false)
    private Retailer retailer;
}
