package com.eva.map.visit;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.UUID;

public record VisitRequest(
        UUID regionId,
        @Size(max = 16) String regionCode,
        LocalDate visitedAt,
        @Size(max = 1000) String note,
        @Pattern(regexp = "^#[0-9A-Fa-f]{6}$") String color
) {
}
