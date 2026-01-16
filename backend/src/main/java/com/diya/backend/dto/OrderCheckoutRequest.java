package com.diya.backend.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderCheckoutRequest {
    // Either send wholesalerId or resolve from cart — but we keep wholesalerId as
    // explicit for clarity
    private String wholesalerId;
    // payment method / reference can be extended
    private String paymentMethod;
    private String paymentReference;
}
