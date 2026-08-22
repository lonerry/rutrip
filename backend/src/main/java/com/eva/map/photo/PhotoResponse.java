package com.eva.map.photo;

import java.time.Instant;
import java.util.UUID;

public record PhotoResponse(
        UUID id,
        String url,
        String contentType,
        UUID storyId,
        UUID placeId,
        UUID visitId,
        UUID regionId,
        Instant createdAt
) {
}
