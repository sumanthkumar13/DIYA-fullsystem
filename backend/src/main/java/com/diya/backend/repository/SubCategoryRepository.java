package com.diya.backend.repository;

import com.diya.backend.entity.SubCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.*;

@Repository
public interface SubCategoryRepository extends JpaRepository<SubCategory, UUID> {

    // ✅ list all subcategories under a category
    List<SubCategory> findByCategoryId(UUID categoryId);

    // ✅ top level subcategories only
    List<SubCategory> findByCategoryIdAndParentSubCategoryIsNull(UUID categoryId);

    // ✅ children of a parent
    List<SubCategory> findByParentSubCategoryId(UUID parentId);

    // ✅ duplicate check (TOP level)
    Optional<SubCategory> findByCategoryIdAndParentSubCategoryIsNullAndNameIgnoreCase(UUID categoryId, String name);

    // ✅ duplicate check (CHILD)
    Optional<SubCategory> findByParentSubCategoryIdAndNameIgnoreCase(UUID parentId, String name);

    // Optional<SubCategory> findByCategoryIdAndName(UUID categoryId, String name);
}
