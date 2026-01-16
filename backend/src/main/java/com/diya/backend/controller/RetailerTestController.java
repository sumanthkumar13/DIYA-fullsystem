package com.diya.backend.controller;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/retailer")
public class RetailerTestController {
    @GetMapping("/test")
    public String test() {
        return "retailer ok";
    }
}
