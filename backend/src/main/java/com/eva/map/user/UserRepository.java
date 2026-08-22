package com.eva.map.user;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    @Query("""
            select u from User u
            where u.id <> :selfId
              and (
                :q = ''
                or lower(u.displayName) like lower(concat('%', :q, '%'))
                or lower(u.email) like lower(concat('%', :q, '%'))
              )
            order by u.displayName
            """)
    List<User> search(@Param("selfId") UUID selfId, @Param("q") String q, Pageable pageable);
}
