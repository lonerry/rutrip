package com.eva.map.notify;

import java.time.Instant;
import java.util.UUID;

public record NotificationResponse(
        UUID id,
        String type,
        boolean read,
        Instant createdAt,
        Actor actor
) {
    public record Actor(UUID id, String displayName, String avatarUrl) {
    }
}
