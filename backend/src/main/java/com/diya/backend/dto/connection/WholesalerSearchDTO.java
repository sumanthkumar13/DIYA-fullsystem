package com.diya.backend.dto.connection;

import com.diya.backend.entity.Wholesaler;
import lombok.Builder;

import java.util.UUID;

@Builder
public class WholesalerSearchDTO {
    public UUID id;
    public String businessName;
    public String handle;
    public String city;
    public String state;
    public String pincode;
    public Wholesaler.VisibilityMode visibilityMode;

    // ✅ NEW: Unique ID retailer can use to search & connect
    public String inviteCode;
}
