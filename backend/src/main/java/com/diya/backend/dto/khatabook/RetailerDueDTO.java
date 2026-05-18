package com.diya.backend.dto.khatabook;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RetailerDueDTO {
    private UUID retailerId;
    private String retailerName;
    private String shopName;
    /** City from retailer profile (for search / display). */
    private String city;
    private String phone;
    private BigDecimal totalDue;
    private BigDecimal overdueAmount;
    private LocalDateTime lastPaymentDate;
    private LocalDateTime lastOrderDate;
    private Long overdueDays;
}
