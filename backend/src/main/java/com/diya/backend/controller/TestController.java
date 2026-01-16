package com.diya.backend.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class TestController {

    @GetMapping("/api/test")
    public String testProtectedEndpoint() {
        return "✅ You accessed a protected endpoint!";
    }
}
