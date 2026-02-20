package com.diya.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "invoice_items", indexes = {
        @Index(name = "idx_invoice_item_invoice", columnList = "invoice_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InvoiceItem {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invoice_id", nullable = false)
    private Invoice invoice;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(precision = 19, scale = 4, nullable = false)
    private BigDecimal quantitySellingUnit;

    @Column(precision = 19, scale = 4, nullable = false)
    private BigDecimal quantityBaseUnit;

    @Column(precision = 19, scale = 4, nullable = false)
    private BigDecimal rate;

    @Column(precision = 19, scale = 2, nullable = false)
    private BigDecimal taxableValue;

    @Column(precision = 19, scale = 2, nullable = false)
    private BigDecimal cgst;

    @Column(precision = 19, scale = 2, nullable = false)
    private BigDecimal sgst;

    @Column(precision = 19, scale = 2, nullable = false)
    private BigDecimal lineTotal;
}
