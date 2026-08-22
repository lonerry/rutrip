package com.eva.map.friend;

import com.eva.map.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "friendships")
@Getter
@Setter
@NoArgsConstructor
public class Friendship {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "requester_id")
    private User requester;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "addressee_id")
    private User addressee;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private FriendshipStatus status = FriendshipStatus.PENDING;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public User other(UUID userId) {
        return requester.getId().equals(userId) ? addressee : requester;
    }
}
