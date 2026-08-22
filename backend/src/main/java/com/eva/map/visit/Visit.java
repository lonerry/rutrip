package com.eva.map.visit;

import com.eva.map.region.Region;
import com.eva.map.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "visits")
@Getter
@Setter
@NoArgsConstructor
public class Visit {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "region_id")
    private Region region;

    @Column(name = "visited_at")
    private LocalDate visitedAt;

    @Column(length = 1000)
    private String note;

    @Column(nullable = false, length = 7)
    private String color = "#3b82f6";

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();
}
