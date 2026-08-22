package com.eva.map.story;

import java.time.Instant;
import java.util.UUID;

public record StoryResponse(
        UUID id,
        String title,
        String body,
        UUID regionId,
        UUID placeId,
        Instant createdAt
) {
}
