package com.diya.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Enumerated;
import jakarta.persistence.EnumType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.FetchType;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;
import com.fasterxml.jackson.annotation.JsonIdentityInfo;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.ObjectIdGenerators;

@JsonIdentityInfo(generator = ObjectIdGenerators.PropertyGenerator.class, property = "id")
@JsonIgnoreProperties({ "hibernateLazyInitializer", "handler" })
@Entity
@Table(name = "retailer_profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Retailer {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    /**
     * Linked user account for this retailer (optional).
     * For invited retailers created by wholesalers, this will be null
     * until the retailer installs the app and completes signup.
     */
    @OneToOne(optional = true)
    @JoinColumn(name = "user_id", unique = true)
    private User user;

    /**
     * The wholesaler who created/owns this retailer (nullable for legacy or
     * self-signup retailers).
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "wholesaler_id")
    private Wholesaler wholesaler;

    private String shopName;
    private String address;
    private String city;
    /** Canonical territory for analytics (wholesaler-defined regions). */
    @Column(nullable = false, length = 80)
    private String region;
    private String state;
    private String phoneContact;

    /**
     * Password hash for retailer accounts created by wholesalers.
     * Null indicates retailer has not activated their account yet.
     */
    @JsonIgnore
    private String password;

    @Column(name = "gst_number")
    private String gstNumber;

    @Builder.Default
    private boolean isActive = true;

    /**
     * Whether this retailer account has been explicitly claimed by the retailer
     * via phone OTP flow in the app.
     * Defaults to false for all wholesaler-created retailers.
     */
    @Builder.Default
    @Column(name = "account_claimed", nullable = false)
    private boolean accountClaimed = false;

    /**
     * Whether the retailer's phone number has been verified via OTP
     * as part of the claim / activation flow.
     * Defaults to false for existing rows.
     */
    @Builder.Default
    @Column(name = "otp_verified", nullable = false)
    private boolean otpVerified = false;

    /**
     * Timestamp when the retailer successfully claimed / activated
     * this account via OTP and set their password.
     */
    @Column(name = "claimed_at")
    private LocalDateTime claimedAt;

    public enum AccountStatus {
        CREATED_BY_WHOLESALER,
        ACTIVATION_REQUIRED,
        ACTIVE,
        SUSPENDED,
        // Kept for backward compatibility with older data
        INVITED
    }

    /**
     * Lifecycle / onboarding status for the retailer.
     * CREATED_BY_WHOLESALER: created by wholesaler but retailer has not logged in
     * yet.
     * ACTIVATION_REQUIRED: OTP sent, awaiting retailer to verify and set password.
     * ACTIVE: retailer has a linked User account and can use the app.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "account_status", nullable = false)
    @Builder.Default
    private AccountStatus accountStatus = AccountStatus.CREATED_BY_WHOLESALER;

    /**
     * Agreed credit limit for this retailer, in rupees.
     */
    @Column(name = "credit_limit", precision = 19, scale = 2)
    private BigDecimal creditLimit;

    /**
     * Free-form internal notes for the wholesaler about this retailer.
     */
    // @Lob
    // @Column(name = "notes")
    // private String notes;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;
}
