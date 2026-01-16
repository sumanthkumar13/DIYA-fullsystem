package com.diya.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "connections", uniqueConstraints = @UniqueConstraint(columnNames = { "wholesaler_id", "retailer_id" }))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Connection {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "wholesaler_id", nullable = false)
    private Wholesaler wholesaler;

    @ManyToOne
    @JoinColumn(name = "retailer_id", nullable = false)
    private Retailer retailer;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    private Status status = Status.PENDING;

    @Builder.Default
    private LocalDateTime requestedAt = LocalDateTime.now();

    private LocalDateTime respondedAt;

    public enum Status {
        PENDING, APPROVED, REJECTED, BLOCKED
    }
}
