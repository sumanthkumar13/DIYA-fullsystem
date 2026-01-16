package com.diya.backend.dto.connection;

import com.diya.backend.entity.Wholesaler;
import lombok.Data;

@Data
public class VisibilityModeUpdateDTO {
    private Wholesaler.VisibilityMode visibilityMode;
}
