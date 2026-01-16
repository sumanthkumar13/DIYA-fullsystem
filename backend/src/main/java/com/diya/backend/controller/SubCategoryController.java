package com.diya.backend.controller;

import com.diya.backend.dto.category.SubCategoryCreateRequest;
import com.diya.backend.dto.category.SubCategoryDTO;
import com.diya.backend.entity.SubCategory;
import com.diya.backend.service.SubCategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/wholesaler/subcategories")
@RequiredArgsConstructor
public class SubCategoryController {

    private final SubCategoryService subCategoryService;

    @PostMapping
    public SubCategoryDTO create(@RequestBody SubCategoryCreateRequest req) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        SubCategory sc = subCategoryService.createSubCategory(auth.getName(), getAuthType(auth), req);
        return toDto(sc);
    }

    @GetMapping("/category/{categoryId}")
    public List<SubCategoryDTO> getByCategory(@PathVariable UUID categoryId) {
        return subCategoryService.getByCategory(categoryId)
                .stream()
                .map(this::toDto)
                .toList();
    }

    @GetMapping("/children/{parentId}")
    public List<SubCategoryDTO> getByParent(@PathVariable UUID parentId) {
        return subCategoryService.getByParent(parentId)
                .stream()
                .map(this::toDto)
                .toList();
    }

    private SubCategoryDTO toDto(SubCategory sc) {
        return new SubCategoryDTO(
                sc.getId(),
                sc.getName(),
                sc.getCategory() != null ? sc.getCategory().getId() : null,
                sc.getParentSubCategory() != null ? sc.getParentSubCategory().getId() : null);
    }

    private String getAuthType(Authentication auth) {
        return auth.getName().contains("@") ? "EMAIL" : "PHONE";
    }
}
