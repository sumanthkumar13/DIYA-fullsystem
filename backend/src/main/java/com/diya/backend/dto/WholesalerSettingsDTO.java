package com.diya.backend.dto;

import com.diya.backend.entity.Wholesaler;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WholesalerSettingsDTO {

    private String businessName;
    private String ownerName;
    private String phone;
    private String address;
    private String gstin;
    /** Null for legacy wholesalers until they set it in settings. */
    private String businessType;
    private Wholesaler.VisibilityMode visibilityMode;
    /** Email from User, for display only. */
    private String email;
}
