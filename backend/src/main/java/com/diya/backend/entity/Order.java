package com.diya.backend.entity;

import com.fasterxml.jackson.annotation.JsonIdentityInfo;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.ObjectIdGenerators;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@JsonIdentityInfo(generator = ObjectIdGenerators.PropertyGenerator.class, property = "id")
@JsonIgnoreProperties({ "hibernateLazyInitializer", "handler" })
@Entity
@Table(name = "orders")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "wholesaler_id", nullable = false)
    private Wholesaler wholesaler;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "retailer_id", nullable = false)
    private Retailer retailer;

    @JsonIgnore
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Payment> payments = new ArrayList<>();

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<OrderItem> orderItems = new ArrayList<>();

    @Column(nullable = false, unique = true)
    private String orderNumber;

    // timestamps
    @Builder.Default
    private LocalDateTime placedAt = LocalDateTime.now();
    private LocalDateTime acceptedAt;
    private LocalDateTime dispatchedAt;
    private LocalDateTime deliveredAt;
    private LocalDateTime cancelledAt;

    // edit metadata (nullable)
    private LocalDateTime editedAt;
    private String editedBy;   // identifier (email/phone) for audit
    private String editReason; // required when editing, nullable otherwise

    // payment terms (order-level credit days)
    @Enumerated(EnumType.STRING)
    private PaymentMode paymentMode; // CASH / UPI / CREDIT

    private Integer creditDays; // only for CREDIT

    private LocalDateTime dueDate; // acceptedAt + creditDays (CREDIT only)

    /** Credit amount approved by wholesaler for this order (outstanding until paid). */
    @Column(precision = 19, scale = 2)
    private BigDecimal approvedCreditAmount;

    /** Due date for credit (now + creditDays) when order accepted on credit. */
    private LocalDateTime creditDueDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Status status = Status.PLACED;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private PaymentStatus paymentStatus = PaymentStatus.UNPAID;

    // totals snapshot
    @Column(precision = 19, scale = 2, nullable = false)
    private BigDecimal subtotal;
    @Column(precision = 19, scale = 2, nullable = false)
    private BigDecimal taxAmount;
    @Column(precision = 19, scale = 2, nullable = false)
    private BigDecimal deliveryCharge;
    @Column(precision = 19, scale = 2, nullable = false)
    private BigDecimal totalAmount;

    public enum Status {
        PLACED, // retailer checkout completed, waiting wholesaler action
        ACCEPTED, // wholesaler confirmed order
        REJECTED, // wholesaler rejected
        PACKING,
        DISPATCHED,
        DELIVERED,
        COMPLETED,
        CANCELLED,
        INVOICED  // invoice finalized for this order
    }

    public enum PaymentStatus {
        UNPAID, PARTIAL, PAID
    }

    public enum PaymentMode {
        CASH,
        UPI,
        CREDIT
    }
}
