package com.eva.map.friend;

import java.util.UUID;

public record PersonResponse(
        UUID id,
        String displayName,
        String avatarUrl,
        String mapColor,
        String relation,
        long visitedCount,
        long storyCount,
        long photoCount
) {
}
