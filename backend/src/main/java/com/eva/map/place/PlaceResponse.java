package com.eva.map.place;

import java.util.UUID;

public record PlaceResponse(
        UUID id,
        String title,
        String description,
        double lat,
        double lng,
        UUID regionId
) {
}
