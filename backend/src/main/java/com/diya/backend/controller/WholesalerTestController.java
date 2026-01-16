package com.diya.backend.controller;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/wholesaler")
public class WholesalerTestController {
    @GetMapping("/test")
    public String test() {
        return "wholesaler ok";
    }
}
