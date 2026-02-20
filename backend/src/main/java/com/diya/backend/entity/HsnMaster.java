package com.diya.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "hsn_master")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HsnMaster {

    @Id
    @Column(name = "hsn_code", length = 20)
    private String hsnCode;

    @Column(length = 500)
    private String description;

    @Column(precision = 5, scale = 2)
    private BigDecimal gstRate;

    /**
     * Comma-separated searchable keywords (e.g. "agarbathi, incense, dhoop").
     */
    @Column(length = 1000)
    private String keywords;
}
