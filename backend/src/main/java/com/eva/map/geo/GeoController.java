package com.eva.map.geo;

import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/geo")
public class GeoController {

    private final GeoService geoService;

    public GeoController(GeoService geoService) {
        this.geoService = geoService;
    }

    @GetMapping("/search")
    public List<GeoHit> search(
            @RequestParam String q,
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lng
    ) {
        return geoService.search(q, lat, lng);
    }

    @GetMapping("/reverse")
    public ResponseEntity<GeoHit> reverse(@RequestParam double lat, @RequestParam double lng) {
        GeoHit hit = geoService.reverse(lat, lng);
        return hit == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(hit);
    }
}
