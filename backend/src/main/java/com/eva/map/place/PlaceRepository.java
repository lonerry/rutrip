package com.eva.map.place;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlaceRepository extends JpaRepository<Place, UUID> {

    List<Place> findAllByUserIdOrderByCreatedAtDesc(UUID userId);

    Optional<Place> findByIdAndUserId(UUID id, UUID userId);
}
