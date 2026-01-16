package com.diya.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data // generates getters + setters + toString + equals + hashCode
@NoArgsConstructor // generates a no-args constructor
@AllArgsConstructor // generates a constructor with all fields
@Builder // allows builder pattern
public class UserDTO {

    private String name;
    private String phone;
    private String email;
    private String role; // "WHOLESALER" or "RETAILER"
}
