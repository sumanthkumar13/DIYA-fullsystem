package com.diya.backend.repository;

import com.diya.backend.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CategoryRepository extends JpaRepository<Category, UUID> {
    List<Category> findByWholesalerId(UUID wholesalerId);
    Optional<Category> findByWholesalerIdAndName(UUID wholesalerId, String name);
}
