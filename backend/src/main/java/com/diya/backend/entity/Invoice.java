package com.diya.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "invoices")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Invoice {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @OneToOne
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @ManyToOne
    @JoinColumn(name = "wholesaler_id", nullable = false)
    private Wholesaler wholesaler;

    private String invoiceNumber;
    private String invoiceUrl;

    @Builder.Default
    private LocalDateTime generatedAt = LocalDateTime.now();
}
