package com.diya.backend.dto.connection;

import com.diya.backend.entity.Connection;
import lombok.Data;

@Data
public class ConnectionStatusUpdateDTO {
    private Connection.Status status; // APPROVED / REJECTED
}
