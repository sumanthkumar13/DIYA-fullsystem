package com.diya.backend.service;

import com.diya.backend.dto.category.SubCategoryCreateRequest;
import com.diya.backend.dto.category.SubCategoryUpdateRequest;
import com.diya.backend.entity.Category;
import com.diya.backend.entity.SubCategory;
import com.diya.backend.entity.Wholesaler;
import com.diya.backend.repository.CategoryRepository;
import com.diya.backend.repository.ProductRepository;
import com.diya.backend.repository.SubCategoryRepository;
import com.diya.backend.repository.WholesalerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SubCategoryService {

    private final SubCategoryRepository subCategoryRepository;
    private final CategoryRepository categoryRepository;
    private final WholesalerRepository wholesalerRepository;
    private final ProductRepository productRepository;

    public SubCategory createSubCategory(String identifier, String authType, SubCategoryCreateRequest req) {

        // ✅ clean name (prevents duplicates due to spaces/case)
        String cleanName = req.getName() == null ? "" : req.getName().trim();
        if (cleanName.isEmpty()) {
            throw new RuntimeException("Subcategory name is required");
        }

        Category category;
        SubCategory parent = null;

        // ✅ resolve parent/category correctly
        if (req.getParentSubId() != null) {
            parent = subCategoryRepository.findById(req.getParentSubId())
                    .orElseThrow(() -> new RuntimeException("Parent Subcategory not found"));

            category = parent.getCategory(); // inherit from parent
        } else {
            if (req.getCategoryId() == null) {
                throw new RuntimeException("Category is required for top-level subcategory");
            }

            category = categoryRepository.findById(req.getCategoryId())
                    .orElseThrow(() -> new RuntimeException("Category not found"));
        }

        Wholesaler wholesaler = getWholesaler(identifier, authType);

        if (!category.getWholesaler().getId().equals(wholesaler.getId())) {
            throw new RuntimeException("Category does not belong to this wholesaler");
        }

        // ✅ HIERARCHY SAFE DUPLICATE CHECK
        Optional<SubCategory> dup;

        if (parent == null) {
            // TOP LEVEL: unique only among top-level nodes of this category
            dup = subCategoryRepository
                    .findByCategoryIdAndParentSubCategoryIsNullAndNameIgnoreCase(category.getId(), cleanName);
        } else {
            // CHILD: unique only inside the same parent
            dup = subCategoryRepository
                    .findByParentSubCategoryIdAndNameIgnoreCase(parent.getId(), cleanName);
        }

        dup.ifPresent(s -> {
            throw new RuntimeException("Subcategory already exists");
        });

        SubCategory sub = SubCategory.builder()
                .name(cleanName)
                .category(category)
                .parentSubCategory(parent)
                .build();

        return subCategoryRepository.save(sub);
    }

    public List<SubCategory> getSubcategories(String identifier, String authType, UUID categoryId) {

        // fetch category
        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new RuntimeException("Category not found"));

        // fetch wholesaler
        var wholesaler = getWholesaler(identifier, authType);

        // ensure category belongs to this wholesaler
        if (!category.getWholesaler().getId().equals(wholesaler.getId())) {
            throw new RuntimeException("Access denied: Category not owned by wholesaler");
        }

        return subCategoryRepository.findByCategoryId(categoryId);
    }

    private Wholesaler getWholesaler(String identifier, String authType) {
        if ("EMAIL".equalsIgnoreCase(authType)) {
            return wholesalerRepository.findByUserEmail(identifier)
                    .orElseThrow(() -> new RuntimeException("Wholesaler not found"));
        }
        return wholesalerRepository.findByUserPhone(identifier)
                .orElseThrow(() -> new RuntimeException("Wholesaler not found"));
    }

    public List<SubCategory> getByCategory(UUID categoryId) {
        return subCategoryRepository.findByCategoryIdAndParentSubCategoryIsNull(categoryId);
    }

    public List<SubCategory> getByParent(UUID parentId) {
        return subCategoryRepository.findByParentSubCategoryId(parentId);
    }

    public SubCategory updateSubCategoryName(String identifier, String authType, UUID subcategoryId, SubCategoryUpdateRequest req) {
        Wholesaler wholesaler = getWholesaler(identifier, authType);
        if (req == null || req.getName() == null || req.getName().trim().isEmpty()) {
            throw new RuntimeException("Subcategory name is required");
        }
        String name = req.getName().trim();
        SubCategory sub = subCategoryRepository.findById(subcategoryId)
                .orElseThrow(() -> new RuntimeException("Subcategory not found"));
        if (sub.getCategory() == null || sub.getCategory().getWholesaler() == null
                || !sub.getCategory().getWholesaler().getId().equals(wholesaler.getId())) {
            throw new RuntimeException("Access denied");
        }

        // Duplicate check within same parent scope (same logic as create)
        if (sub.getParentSubCategory() == null) {
            subCategoryRepository
                    .findByCategoryIdAndParentSubCategoryIsNullAndNameIgnoreCase(sub.getCategory().getId(), name)
                    .ifPresent(existing -> {
                        if (!existing.getId().equals(sub.getId())) throw new RuntimeException("Subcategory already exists");
                    });
        } else {
            subCategoryRepository
                    .findByParentSubCategoryIdAndNameIgnoreCase(sub.getParentSubCategory().getId(), name)
                    .ifPresent(existing -> {
                        if (!existing.getId().equals(sub.getId())) throw new RuntimeException("Subcategory already exists");
                    });
        }

        sub.setName(name);
        return subCategoryRepository.save(sub);
    }

    public void deleteSubCategory(String identifier, String authType, UUID subcategoryId) {
        Wholesaler wholesaler = getWholesaler(identifier, authType);
        SubCategory sub = subCategoryRepository.findById(subcategoryId)
                .orElseThrow(() -> new RuntimeException("Subcategory not found"));
        if (sub.getCategory() == null || sub.getCategory().getWholesaler() == null
                || !sub.getCategory().getWholesaler().getId().equals(wholesaler.getId())) {
            throw new RuntimeException("Access denied");
        }
        if (!subCategoryRepository.findByParentSubCategoryId(sub.getId()).isEmpty()) {
            throw new RuntimeException("Cannot delete subcategory with children");
        }
        deleteSubCategoryInternal(wholesaler, sub);
    }

    @Transactional
    protected void deleteSubCategoryInternal(Wholesaler wholesaler, SubCategory sub) {
        long totalRefs = productRepository.countByWholesalerIdAndSubcategoryId(wholesaler.getId(), sub.getId());
        if (totalRefs > 0) {
            long activeRefs = productRepository.countByWholesalerIdAndSubcategoryIdAndDeletedFalse(wholesaler.getId(), sub.getId());
            if (activeRefs > 0) {
                throw new RuntimeException("Cannot delete subcategory with products");
            }
            // Only deleted products reference it -> detach those refs so FK allows deletion.
            productRepository.detachDeletedProductsFromSubcategory(wholesaler.getId(), sub.getId());
        }
        subCategoryRepository.delete(sub);
    }
}
