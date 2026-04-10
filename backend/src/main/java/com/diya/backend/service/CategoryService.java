package com.diya.backend.service;

import com.diya.backend.dto.category.CategoryCreateRequest;
import com.diya.backend.dto.category.CategoryTreeDTO;
import com.diya.backend.dto.category.CategoryUpdateRequest;
import com.diya.backend.dto.product.ProductResponseDTO;
import com.diya.backend.entity.Category;
import com.diya.backend.entity.Product;
import com.diya.backend.entity.Wholesaler;
import com.diya.backend.repository.CategoryRepository;
import com.diya.backend.repository.ProductRepository;
import com.diya.backend.repository.SubCategoryRepository;
import com.diya.backend.repository.WholesalerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final WholesalerRepository wholesalerRepository;
    private final CategoryRepository categoryRepository;
    private final SubCategoryRepository subCategoryRepository;
    private final ProductRepository productRepository;

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

            // Products directly under category (subcategory = NULL)
            var categoryProducts = productRepository
                    .findByWholesalerIdAndCategoryIdAndSubcategoryIsNull(wholesaler.getId(), cat.getId())
                    .stream()
                    .map(this::toDto)
                    .toList();

            var subs = subCategoryRepository.findByCategoryId(cat.getId())
                    .stream()
                    .map(s -> {
                        var subProducts = productRepository
                                .findByWholesalerIdAndSubcategoryId(wholesaler.getId(), s.getId())
                                .stream()
                                .map(this::toDto)
                                .toList();

                        return CategoryTreeDTO.SubNode.builder()
                                .id(s.getId())
                                .name(s.getName())
                                .products(subProducts)
                                .build();
                    })
                    .toList();

            return CategoryTreeDTO.builder()
                    .id(cat.getId())
                    .name(cat.getName())
                    .products(categoryProducts)
                    .subcategories(subs)
                    .build();

        }).toList();
    }

    public Category updateCategoryName(String identifier, String authType, UUID categoryId, CategoryUpdateRequest req) {
        Wholesaler wholesaler = getWholesaler(identifier, authType);
        if (req == null || req.getName() == null || req.getName().trim().isEmpty()) {
            throw new RuntimeException("Category name is required");
        }
        String name = req.getName().trim();
        Category category = categoryRepository.findByIdAndWholesalerId(categoryId, wholesaler.getId())
                .orElseThrow(() -> new RuntimeException("Category not found"));
        categoryRepository.findByWholesalerIdAndName(wholesaler.getId(), name)
                .ifPresent(c -> {
                    if (!c.getId().equals(category.getId())) {
                        throw new RuntimeException("Category already exists");
                    }
                });
        category.setName(name);
        return categoryRepository.save(category);
    }

    public void deleteCategory(String identifier, String authType, UUID categoryId) {
        Wholesaler wholesaler = getWholesaler(identifier, authType);
        Category category = categoryRepository.findByIdAndWholesalerId(categoryId, wholesaler.getId())
                .orElseThrow(() -> new RuntimeException("Category not found"));

        boolean hasProducts = productRepository.existsByWholesalerIdAndCategoryIdAndDeletedFalse(wholesaler.getId(), categoryId);
        if (hasProducts) {
            throw new RuntimeException("Cannot delete category with products");
        }
        if (!subCategoryRepository.findByCategoryId(categoryId).isEmpty()) {
            throw new RuntimeException("Cannot delete category with subcategories");
        }

        categoryRepository.delete(category);
    }

    private ProductResponseDTO toDto(Product p) {
        return ProductResponseDTO.builder()
                .id(p.getId())
                .sku(p.getSku())
                .sequenceNumber(p.getSequenceNumber())
                .name(p.getName())
                .description(p.getDescription())
                .unit(p.getUnit())
                .price(p.getPrice())
                .mrp(p.getMrp())
                .stock(p.getStock())
                .status(p.getStock() == null ? "Unknown"
                        : p.getStock() == 0 ? "Out of Stock" : p.getStock() < 20 ? "Low Stock" : "In Stock")
                .imageUrl(p.getImageUrl())
                .categoryId(p.getCategory() == null ? null : p.getCategory().getId())
                .categoryName(p.getCategory() == null ? null : p.getCategory().getName())
                .subcategoryId(p.getSubcategory() == null ? null : p.getSubcategory().getId())
                .subcategoryName(p.getSubcategory() == null ? null : p.getSubcategory().getName())
                .isActive(p.isActive())
                .visibleToRetailer(p.isVisibleToRetailer())
                .build();
    }

}
