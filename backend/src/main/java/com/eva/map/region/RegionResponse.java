package com.eva.map.region;

import java.util.UUID;

public record RegionResponse(
        UUID id,
        String code,
        String name,
        String type,
        boolean visited,
        UUID visitId,
        String color
) {
}
