package com.diya.backend.controller;

import com.diya.backend.dto.category.CategoryCreateRequest;
import com.diya.backend.dto.category.CategoryUpdateRequest;
import com.diya.backend.dto.category.CategoryTreeDTO;
import com.diya.backend.entity.Category;
import com.diya.backend.service.CategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/wholesaler/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    @PostMapping
    public Category create(@RequestBody CategoryCreateRequest req) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return categoryService.createCategory(auth.getName(), getAuthType(auth), req);
    }

    @GetMapping
    public List<Category> list() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return categoryService.getCategories(auth.getName(), getAuthType(auth));
    }

    @PutMapping("/{categoryId}")
    public Category update(@PathVariable UUID categoryId, @RequestBody CategoryUpdateRequest req) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return categoryService.updateCategoryName(auth.getName(), getAuthType(auth), categoryId, req);
    }

    @DeleteMapping("/{categoryId}")
    public void delete(@PathVariable UUID categoryId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        categoryService.deleteCategory(auth.getName(), getAuthType(auth), categoryId);
    }

    private String getAuthType(Authentication auth) {
        return auth.getName().contains("@") ? "EMAIL" : "PHONE";
    }

    @GetMapping("/tree")
    public List<CategoryTreeDTO> getTree() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return categoryService.getCategoryTree(auth.getName(), getAuthType(auth));
    }

}
