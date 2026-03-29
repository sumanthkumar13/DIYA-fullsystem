package com.diya.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.util.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonIdentityInfo;
import com.fasterxml.jackson.annotation.ObjectIdGenerators;

@JsonIdentityInfo(generator = ObjectIdGenerators.PropertyGenerator.class, property = "id")
@JsonIgnoreProperties({ "hibernateLazyInitializer", "handler" })
@Entity
@Table(name = "products", indexes = {
                @Index(name = "idx_product_sku", columnList = "sku")
}, uniqueConstraints = {
                @UniqueConstraint(columnNames = { "wholesaler_id", "sku" })
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Product {

        @Id
        @GeneratedValue(strategy = GenerationType.AUTO)
        private UUID id;

        @ManyToOne
        @JoinColumn(name = "wholesaler_id", nullable = false)
        private Wholesaler wholesaler;

        @ManyToOne
        @JoinColumn(name = "category_id")
        private Category category;

        @ManyToOne
        @JoinColumn(name = "subcategory_id")
        private SubCategory subcategory;

        private String sku; // <-- NOT unique globally anymore

        private Integer sequenceNumber;

        @Builder.Default
        private Integer reservedStock = 0;
        // qty locked due to pending orders

        private String name;
        private String description;
        private String unit;

        private Double price;
        private Double mrp;
        private Integer stock;
        private String imageUrl;

        @Builder.Default
        private boolean active = true;

        @Builder.Default
        private boolean visibleToRetailer = true;

        /*
         * ---------------------------------------------------
         * TAX & BILLING (GST-billable accounting)
         * All nullable for backward compatibility with existing products.
         * ---------------------------------------------------
         */
        @Column(length = 8)
        private String hsnCode;

        @Column(precision = 5, scale = 2)
        private BigDecimal gstRate;

        @Enumerated(EnumType.STRING)
        private TaxType taxType;

        private String baseUnit;
        private String sellingUnit;
        private Integer unitsPerSelling;

        private Boolean priceIncludesTax;

        @Builder.Default
        private Boolean tallyItemSynced = false;

        /** Soft-removed from wholesaler catalog; hidden from retailers */
        @Builder.Default
        private boolean deleted = false;
}
