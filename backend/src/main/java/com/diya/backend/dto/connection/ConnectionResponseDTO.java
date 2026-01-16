package com.diya.backend.dto.connection;

import com.diya.backend.entity.Connection;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.UUID;

@Builder
public class ConnectionResponseDTO {
    public UUID id;
    public UUID wholesalerId;
    public UUID retailerId;
    public Connection.Status status;
    public LocalDateTime requestedAt;
    public LocalDateTime respondedAt;

    // wholesaler preview fields (for retailer UI)
    public String wholesalerBusinessName;
    public String wholesalerHandle;
    public String wholesalerCity;

    // ✅ retailer preview fields (for wholesaler UI)
    public String retailerBusinessName;
    public String retailerCity;
    public String retailerPhone;
}
