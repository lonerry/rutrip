package com.eva.map.region;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RegionRepository extends JpaRepository<Region, UUID> {

    Optional<Region> findByCodeIgnoreCase(String code);

    List<Region> findAllByOrderByNameAsc();
}
