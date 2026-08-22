package com.eva.map.visit;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface VisitRepository extends JpaRepository<Visit, UUID> {

    boolean existsByUserIdAndRegionId(UUID userId, UUID regionId);

    Optional<Visit> findByIdAndUserId(UUID id, UUID userId);

    @Query("select v.region.id from Visit v where v.user.id = :userId")
    List<UUID> findVisitedRegionIdsByUserId(UUID userId);

    @Query("select v from Visit v join fetch v.region where v.user.id = :userId order by v.createdAt desc")
    List<Visit> findAllByUserIdWithRegion(UUID userId);

    long countByUserId(UUID userId);
}
