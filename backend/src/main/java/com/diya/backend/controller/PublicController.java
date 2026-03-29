package com.diya.backend.controller;

import com.diya.backend.dto.category.PublicCategoryDTO;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/public")
public class PublicController {

    @GetMapping("/categories")
    public List<PublicCategoryDTO> getCategories() {
        return List.of(
                new PublicCategoryDTO("Grocery"),
                new PublicCategoryDTO("Pharmacy"),
                new PublicCategoryDTO("Electronics"),
                new PublicCategoryDTO("Stationery"),
                new PublicCategoryDTO("Hardware"));
    }
}
