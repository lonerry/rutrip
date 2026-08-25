package com.eva.map.geo;

import java.util.List;

public record GeoHit(
        String name,
        String description,
        double lat,
        double lng,
        List<Double> bbox,
        String kind
) {
}
