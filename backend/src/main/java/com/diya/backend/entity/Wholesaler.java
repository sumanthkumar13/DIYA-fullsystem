package com.diya.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Table(name = "wholesaler_profiles", indexes = {
        @Index(name = "idx_wh_handle", columnList = "handle"),
        @Index(name = "idx_wh_city", columnList = "city"),
        @Index(name = "idx_wh_pincode", columnList = "pincode"),
        @Index(name = "idx_wh_invite_code", columnList = "inviteCode")

})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({ "hibernateLazyInitializer", "handler" })
public class Wholesaler {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    /*
     * ---------------------------------------------------
     * USER RELATION (One-to-One)
     * ---------------------------------------------------
     */
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;
    // Add this field to Wholesaler entity
    @Builder.Default
    private Integer orderSequence = 0;

    /*
     * ---------------------------------------------------
     * BASIC BUSINESS DETAILS
     * ---------------------------------------------------
     */
    @Column(nullable = false, unique = true, length = 50)
    private String handle; // @lakshmitraders

    @Column(nullable = false, unique = true, length = 20)
    private String inviteCode; // example: DIYA-4K7P

    @Column(nullable = false)
    private String businessName;

    private String gstin;

    private String city;

    private String state;

    @Column(length = 10)
    private String pincode;

    @Column(length = 250)
    private String address;

    private String logoUrl;

    /*
     * ---------------------------------------------------
     * VISIBILITY & INVOICE
     * ---------------------------------------------------
     */
    @Builder.Default
    @Enumerated(EnumType.STRING)
    private VisibilityMode visibilityMode = VisibilityMode.PUBLIC;

    @Builder.Default
    private Integer invoiceSequence = 0;

    /*
     * ---------------------------------------------------
     * BUSINESS CATEGORY (List<String>)
     * ---------------------------------------------------
     */
    @ElementCollection
    @CollectionTable(name = "wholesaler_categories", joinColumns = @JoinColumn(name = "wholesaler_id"))
    @Column(name = "category")
    private List<String> categories;

    /*
     * ---------------------------------------------------
     * DELIVERY MODEL
     * ---------------------------------------------------
     */
    @Enumerated(EnumType.STRING)
    private DeliveryModel deliveryModel;

    public enum DeliveryModel {
        DELIVERY, PICKUP
    }

    /*
     * ---------------------------------------------------
     * PAYMENT SETTINGS
     * ---------------------------------------------------
     */
    private String upiId;

    private String upiQrImage;

    /*
     * ---------------------------------------------------
     * TIMESTAMP FIELDS
     * ---------------------------------------------------
     */
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    /*
     * ---------------------------------------------------
     * VISIBILITY MODE ENUM
     * ---------------------------------------------------
     */
    public enum VisibilityMode {
        PUBLIC, PRIVATE
    }
}
