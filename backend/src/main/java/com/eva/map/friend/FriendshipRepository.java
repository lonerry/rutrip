package com.eva.map.friend;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FriendshipRepository extends JpaRepository<Friendship, UUID> {

    @Query("""
            select f from Friendship f
            join fetch f.requester
            join fetch f.addressee
            where (f.requester.id = :a and f.addressee.id = :b)
               or (f.requester.id = :b and f.addressee.id = :a)
            """)
    Optional<Friendship> findBetween(@Param("a") UUID a, @Param("b") UUID b);

    @Query("""
            select f from Friendship f
            join fetch f.requester
            join fetch f.addressee
            where f.status = :status
              and (f.requester.id = :userId or f.addressee.id = :userId)
            order by f.createdAt desc
            """)
    List<Friendship> findByUserIdAndStatus(@Param("userId") UUID userId, @Param("status") FriendshipStatus status);

    @Query("""
            select f from Friendship f
            join fetch f.requester
            join fetch f.addressee
            where f.status = :status
              and f.addressee.id = :userId
            order by f.createdAt desc
            """)
    List<Friendship> findIncoming(@Param("userId") UUID userId, @Param("status") FriendshipStatus status);
}
