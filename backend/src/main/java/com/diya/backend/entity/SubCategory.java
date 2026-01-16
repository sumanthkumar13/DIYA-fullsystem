package com.diya.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.*;

@Entity
@Table(name = "subcategories", uniqueConstraints = {
        @UniqueConstraint(columnNames = { "parent_sub_id", "name" })

})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubCategory {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "category_id")
    private Category category;

    @ManyToOne
    @JoinColumn(name = "parent_sub_id")
    private SubCategory parentSubCategory;
    @OneToMany(mappedBy = "parentSubCategory", cascade = CascadeType.ALL)
    private List<SubCategory> children = new ArrayList<>();

    @Column(nullable = false)
    private String name;
}
