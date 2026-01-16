package com.diya.backend.entity;

import com.fasterxml.jackson.annotation.JsonIdentityInfo;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.ObjectIdGenerators;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@JsonIdentityInfo(generator = ObjectIdGenerators.PropertyGenerator.class, property = "id")
@JsonIgnoreProperties({ "hibernateLazyInitializer", "handler" })
@Entity
@Table(name = "payments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    // Optional: payment might be mapped to an order OR just outstanding ledger
    // payment
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id")
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "wholesaler_id", nullable = false)
    private Wholesaler wholesaler;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "retailer_id", nullable = false)
    private Retailer retailer;

    @Column(nullable = false)
    private Double amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentMode mode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private PaymentStatus status = PaymentStatus.PENDING_VERIFICATION;

    // UPI/NEFT/netbanking references
    private String reference; // UTR / txn id / upi ref etc

    private String note; // optional: "Paid to delivery boy" etc

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime confirmedAt;
    private LocalDateTime rejectedAt;

    // who confirmed?
    private String confirmedBy; // wholesaler identifier (email/phone)

    public enum PaymentMode {
        UPI,
        CASH,
        NEFT,
        NET_BANKING,
        RTGS
    }

    public enum PaymentStatus {
        PENDING_VERIFICATION,
        CONFIRMED,
        REJECTED,
        FAILED
    }
}
