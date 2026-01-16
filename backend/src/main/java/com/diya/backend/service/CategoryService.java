package com.diya.backend.service;

import com.diya.backend.dto.category.CategoryCreateRequest;
import com.diya.backend.dto.category.CategoryTreeDTO;
import com.diya.backend.entity.Category;
import com.diya.backend.entity.Wholesaler;
import com.diya.backend.repository.CategoryRepository;
import com.diya.backend.repository.SubCategoryRepository;
import com.diya.backend.repository.WholesalerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final WholesalerRepository wholesalerRepository;
    private final CategoryRepository categoryRepository;
    private final SubCategoryRepository subCategoryRepository;

    public Category createCategory(String identifier, String authType, CategoryCreateRequest req) {

        Wholesaler wholesaler = getWholesaler(identifier, authType);

        // Prevent duplicate category names
        categoryRepository.findByWholesalerIdAndName(wholesaler.getId(), req.getName())
                .ifPresent(c -> {
                    throw new RuntimeException("Category already exists");
                });

        Category category = Category.builder()
                .wholesaler(wholesaler)
                .name(req.getName())
                .build();

        return categoryRepository.save(category);
    }

    public List<Category> getCategories(String identifier, String authType) {
        Wholesaler wholesaler = getWholesaler(identifier, authType);
        return categoryRepository.findByWholesalerId(wholesaler.getId());
    }

    private Wholesaler getWholesaler(String identifier, String authType) {
        if (authType.equals("EMAIL")) {
            return wholesalerRepository.findByUserEmail(identifier)
                    .orElseThrow(() -> new RuntimeException("Wholesaler not found"));
        }
        return wholesalerRepository.findByUserPhone(identifier)
                .orElseThrow(() -> new RuntimeException("Wholesaler not found"));
    }

    public List<CategoryTreeDTO> getCategoryTree(String identifier, String authType) {

        Wholesaler wholesaler = getWholesaler(identifier, authType);

        List<Category> categories = categoryRepository.findByWholesalerId(wholesaler.getId());

        return categories.stream().map(cat -> {

            var subs = subCategoryRepository.findByCategoryId(cat.getId())
                    .stream()
                    .map(s -> CategoryTreeDTO.SubNode.builder()
                            .id(s.getId())
                            .name(s.getName())
                            .build())
                    .toList();

            return CategoryTreeDTO.builder()
                    .id(cat.getId())
                    .name(cat.getName())
                    .subcategories(subs)
                    .build();

        }).toList();
    }

}
