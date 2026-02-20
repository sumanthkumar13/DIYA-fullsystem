package com.diya.backend.repository;

import com.diya.backend.entity.HsnMaster;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface HsnMasterRepository extends JpaRepository<HsnMaster, String> {

    List<HsnMaster> findAllByOrderByHsnCode();
}
