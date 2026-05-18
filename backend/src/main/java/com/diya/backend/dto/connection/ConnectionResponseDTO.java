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
    public String wholesalerState;
    public String wholesalerPincode;
    public String wholesalerPhone;
    public String wholesalerLogoUrl;
    public String wholesalerAvatarUrl;

    // ✅ retailer preview fields (for wholesaler UI)
    /** Shop / business name on the retailer profile. */
    public String retailerBusinessName;
    /** Proprietor or contact display name (linked user name, else contact name). */
    public String retailerProprietorName;
    public String retailerCity;
    /** Territory / region from retailer profile (fallback when city is blank). */
    public String retailerRegion;
    public String retailerState;
    public String retailerPhone;
}
