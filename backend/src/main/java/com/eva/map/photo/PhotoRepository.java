package com.eva.map.photo;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface PhotoRepository extends JpaRepository<Photo, UUID> {

    Optional<Photo> findByIdAndUserId(UUID id, UUID userId);

    @Query("""
            select p from Photo p
            left join fetch p.story s
            left join fetch s.region
            left join fetch p.place pl
            left join fetch pl.region
            left join fetch p.visit v
            left join fetch v.region
            where p.user.id = :userId
            order by p.createdAt desc
            """)
    List<Photo> findAllByUserId(UUID userId);

    @Query("select p from Photo p where p.user.id = :userId and p.story.id = :storyId order by p.createdAt desc")
    List<Photo> findAllByUserIdAndStoryId(UUID userId, UUID storyId);

    long countByUserId(UUID userId);
}
