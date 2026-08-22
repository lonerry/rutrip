package com.eva.map.story;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StoryRepository extends JpaRepository<Story, UUID> {

    List<Story> findAllByUserIdOrderByCreatedAtDesc(UUID userId);

    Optional<Story> findByIdAndUserId(UUID id, UUID userId);

    long countByUserId(UUID userId);
}
