package com.eva.map.geo;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

@Service
public class GeoService {

    private static final Logger log = LoggerFactory.getLogger(GeoService.class);
    private static final String USER_AGENT = "Rutrip/1.0 (travel map; https://github.com/lonerry/rutrip)";

    private final RestClient http;
    private final ObjectMapper mapper;

    public GeoService(ObjectMapper mapper) {
        this.mapper = mapper;
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(3));
        factory.setReadTimeout(Duration.ofSeconds(8));
        this.http = RestClient.builder()
                .requestFactory(factory)
                .defaultHeader(HttpHeaders.USER_AGENT, USER_AGENT)
                .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                .defaultHeader(HttpHeaders.ACCEPT_LANGUAGE, "ru")
                .build();
    }

    public List<GeoHit> search(String query, Double lat, Double lng) {
        String q = query == null ? "" : query.trim();
        if (q.length() < 2) return List.of();
        List<GeoHit> hits = nominatimSearch(q, lat, lng);
        if (hits.isEmpty()) hits = photonSearch(q, lat, lng);
        return hits;
    }

    public GeoHit reverse(double lat, double lng) {
        try {
            var uri = UriComponentsBuilder.fromUriString("https://nominatim.openstreetmap.org/reverse")
                    .queryParam("lat", lat)
                    .queryParam("lon", lng)
                    .queryParam("format", "json")
                    .queryParam("zoom", 18)
                    .queryParam("addressdetails", 1)
                    .queryParam("namedetails", 1)
                    .queryParam("accept-language", "ru")
                    .encode()
                    .build()
                    .toUri();
            JsonNode node = getJson(uri);
            if (node == null || node.isMissingNode()) return null;
            String name = text(node.path("namedetails").path("name:ru"));
            if (name.isBlank()) name = text(node.path("namedetails").path("name"));
            if (name.isBlank()) name = text(node.path("name"));
            String address = formatAddress(node.path("address"));
            String kind = text(node.path("type"));
            if (name.isBlank() && address.isBlank()) return null;
            return new GeoHit(
                    name.isBlank() ? address : name,
                    name.isBlank() || name.equals(address) ? null : address,
                    lat,
                    lng,
                    null,
                    kind.isBlank() ? null : kind
            );
        } catch (Exception ex) {
            log.warn("Nominatim reverse failed: {}", ex.getMessage());
            return null;
        }
    }

    private List<GeoHit> nominatimSearch(String q, Double lat, Double lng) {
        try {
            var builder = UriComponentsBuilder.fromUriString("https://nominatim.openstreetmap.org/search")
                    .queryParam("q", q)
                    .queryParam("format", "json")
                    .queryParam("addressdetails", 1)
                    .queryParam("namedetails", 1)
                    .queryParam("limit", 7)
                    .queryParam("countrycodes", "ru")
                    .queryParam("accept-language", "ru");
            if (lat != null && lng != null) {
                double pad = 6;
                builder.queryParam("viewbox", "%s,%s,%s,%s".formatted(
                        lng - pad, lat + pad, lng + pad, lat - pad));
            }
            JsonNode root = getJson(builder.encode().build().toUri());
            if (root == null || !root.isArray()) return List.of();
            List<GeoHit> hits = new ArrayList<>();
            for (JsonNode node : root) {
                GeoHit hit = fromNominatim(node);
                if (hit != null) hits.add(hit);
            }
            return hits;
        } catch (Exception ex) {
            log.warn("Nominatim search failed: {}", ex.getMessage());
            return List.of();
        }
    }

    private List<GeoHit> photonSearch(String q, Double lat, Double lng) {
        try {
            var builder = UriComponentsBuilder.fromUriString("https://photon.komoot.io/api/")
                    .queryParam("q", q)
                    .queryParam("lang", "ru")
                    .queryParam("limit", 7);
            if (lat != null && lng != null) {
                builder.queryParam("lat", lat).queryParam("lon", lng);
            }
            JsonNode root = getJson(builder.encode().build().toUri());
            JsonNode features = root == null ? null : root.path("features");
            if (features == null || !features.isArray()) return List.of();
            List<GeoHit> hits = new ArrayList<>();
            for (JsonNode feature : features) {
                GeoHit hit = fromPhoton(feature);
                if (hit != null) hits.add(hit);
            }
            return hits;
        } catch (Exception ex) {
            log.warn("Photon search failed: {}", ex.getMessage());
            return List.of();
        }
    }

    private GeoHit fromNominatim(JsonNode node) {
        double lat = node.path("lat").asDouble(Double.NaN);
        double lng = node.path("lon").asDouble(Double.NaN);
        if (!Double.isFinite(lat) || !Double.isFinite(lng)) return null;
        String name = text(node.path("namedetails").path("name:ru"));
        if (name.isBlank()) name = text(node.path("namedetails").path("name"));
        if (name.isBlank()) name = text(node.path("name"));
        String display = text(node.path("display_name"));
        if (name.isBlank()) name = display;
        if (name.isBlank()) return null;
        String description = display;
        if (!display.isBlank() && display.startsWith(name)) {
            description = display.substring(name.length()).replaceFirst("^,\\s*", "");
        }
        if (description.equals(name)) description = "";
        List<Double> bbox = bbox(node.path("boundingbox"));
        String kind = text(node.path("type"));
        if (kind.isBlank()) kind = text(node.path("class"));
        return new GeoHit(name, description.isBlank() ? null : description, lat, lng, bbox, kind.isBlank() ? null : kind);
    }

    private GeoHit fromPhoton(JsonNode feature) {
        JsonNode coords = feature.path("geometry").path("coordinates");
        if (!coords.isArray() || coords.size() < 2) return null;
        double lng = coords.get(0).asDouble(Double.NaN);
        double lat = coords.get(1).asDouble(Double.NaN);
        if (!Double.isFinite(lat) || !Double.isFinite(lng)) return null;
        JsonNode props = feature.path("properties");
        String name = text(props.path("name"));
        if (name.isBlank()) return null;
        String country = text(props.path("country"));
        if (!country.isBlank() && !country.toLowerCase(Locale.ROOT).contains("росс") && !country.equalsIgnoreCase("russia")) {
            return null;
        }
        String description = String.join(", ",
                List.of(text(props.path("street")), text(props.path("city")), text(props.path("state")), text(props.path("county")))
                        .stream()
                        .filter(part -> !part.isBlank() && !part.equals(name))
                        .toList());
        List<Double> bbox = null;
        JsonNode extent = props.path("extent");
        if (extent.isArray() && extent.size() == 4) {
            bbox = List.of(
                    extent.get(1).asDouble(),
                    extent.get(3).asDouble(),
                    extent.get(0).asDouble(),
                    extent.get(2).asDouble()
            );
        }
        String kind = text(props.path("osm_value"));
        return new GeoHit(name, description.isBlank() ? null : description, lat, lng, bbox, kind.isBlank() ? null : kind);
    }

    private static List<Double> bbox(JsonNode node) {
        if (!node.isArray() || node.size() < 4) return null;
        return List.of(
                node.get(0).asDouble(),
                node.get(1).asDouble(),
                node.get(2).asDouble(),
                node.get(3).asDouble()
        );
    }

    private static String formatAddress(JsonNode address) {
        if (address == null || !address.isObject()) return "";
        String street = join(text(address.path("road")), text(address.path("house_number")));
        String place = first(
                text(address.path("city")),
                text(address.path("town")),
                text(address.path("village")),
                text(address.path("suburb"))
        );
        if (!street.isBlank() && !place.isBlank()) return street + ", " + place;
        return !street.isBlank() ? street : place;
    }

    private JsonNode getJson(java.net.URI uri) throws Exception {
        String body = http.get().uri(uri).retrieve().body(String.class);
        if (body == null || body.isBlank() || body.charAt(0) == '<') return null;
        return mapper.readTree(body);
    }

    private static String text(JsonNode node) {
        return node == null || node.isMissingNode() || node.isNull() ? "" : node.asText("").trim();
    }

    private static String first(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) return value;
        }
        return "";
    }

    private static String join(String left, String right) {
        if (left.isBlank()) return right;
        if (right.isBlank()) return left;
        return left + ", " + right;
    }
}
