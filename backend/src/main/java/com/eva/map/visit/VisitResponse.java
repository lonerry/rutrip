package com.eva.map.visit;

import java.time.LocalDate;
import java.util.UUID;

public record VisitResponse(
        UUID id,
        UUID regionId,
        String regionCode,
        String regionName,
        LocalDate visitedAt,
        String note,
        String color
) {
}
