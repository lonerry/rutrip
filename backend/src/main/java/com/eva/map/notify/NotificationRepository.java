package com.eva.map.notify;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    @EntityGraph(attributePaths = "actor")
    List<Notification> findTop30ByUserIdOrderByCreatedAtDesc(UUID userId);

    long countByUserIdAndReadFalse(UUID userId);

    boolean existsByUserIdAndActorIdAndTypeAndReadFalse(
            UUID userId,
            UUID actorId,
            NotificationType type
    );

    @Modifying
    @Query("update Notification n set n.read = true where n.user.id = :userId and n.read = false")
    void markAllRead(@Param("userId") UUID userId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            delete from Notification n
            where n.user.id = :userId
              and n.actor.id = :actorId
              and n.type = :type
            """)
    void deleteByPairAndType(
            @Param("userId") UUID userId,
            @Param("actorId") UUID actorId,
            @Param("type") NotificationType type
    );
}
