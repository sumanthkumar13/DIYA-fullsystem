package com.diya.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Table(name = "users", indexes = {
        @Index(name = "idx_user_phone", columnList = "phone"),
        @Index(name = "idx_user_role", columnList = "role")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({ "hibernateLazyInitializer", "handler" })
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    /*
     * ------------------------------------
     * LOGIN / CONTACT FIELDS
     * ------------------------------------
     */
    @Column(unique = true)
    private String phone; // optional now

    @Column(unique = true)
    private String email; // optional now

    @JsonIgnore
    @Column(nullable = false)
    private String password;

    private String name;

    /*
     * ------------------------------------
     * ROLE MANAGEMENT
     * ------------------------------------
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    public enum Role {
        WHOLESALER,
        RETAILER,
        ADMIN
    }

    /*
     * ------------------------------------
     * STATUS FLAGS
     * ------------------------------------
     */
    @Builder.Default
    private boolean isActive = true; // deactivate users without deleting

    /*
     * ------------------------------------
     * TIMESTAMPS
     * ------------------------------------
     */
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    /*
     * ------------------------------------
     * AUTO UPDATE TIMESTAMP
     * ------------------------------------
     */
    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
