package com.diya.backend.controller;

import com.diya.backend.dto.hsn.HsnSuggestResponse;
import com.diya.backend.service.HsnSuggestService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/hsn")
@RequiredArgsConstructor
public class HsnSuggestController {

    private final HsnSuggestService hsnSuggestService;

    @GetMapping("/suggest")
    public ResponseEntity<HsnSuggestResponse> suggest(
            @RequestParam(value = "name", required = false) String productName) {
        HsnSuggestResponse response = hsnSuggestService.suggest(productName);
        return ResponseEntity.ok(response);
    }
}
