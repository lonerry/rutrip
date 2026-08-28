package com.eva.map.geo;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
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
    private final String yandexKey;
    private final String mapboxToken;

    public GeoService(
            ObjectMapper mapper,
            @Value("${app.geo.yandex-key:}") String yandexKey,
            @Value("${app.geo.mapbox-token:}") String mapboxToken
    ) {
        this.mapper = mapper;
        this.yandexKey = yandexKey == null ? "" : yandexKey.trim();
        this.mapboxToken = mapboxToken == null ? "" : mapboxToken.trim();
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(2));
        factory.setReadTimeout(Duration.ofMillis(3500));
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

        List<GeoHit> hits = yandexSearch(q, lat, lng);
        if (!hits.isEmpty()) return hits;

        hits = mapboxSearch(q, lat, lng);
        if (!hits.isEmpty()) return hits;

        hits = photonSearch(q, lat, lng);
        if (!hits.isEmpty()) return hits;

        return nominatimSearch(q, lat, lng);
    }

    public GeoHit reverse(double lat, double lng) {
        GeoHit yandex = yandexReverse(lat, lng);
        if (yandex != null) return yandex;
        GeoHit mapbox = mapboxReverse(lat, lng);
        if (mapbox != null) return mapbox;
        return nominatimReverse(lat, lng);
    }

    private List<GeoHit> yandexSearch(String q, Double lat, Double lng) {
        if (yandexKey.isBlank()) return List.of();
        return mergeHits(yandexGeosearch(q, lat, lng), yandexGeocode(q, lat, lng));
    }

    private List<GeoHit> yandexGeosearch(String q, Double lat, Double lng) {
        try {
            var builder = UriComponentsBuilder.fromUriString("https://search-maps.yandex.ru/v1/")
                    .queryParam("apikey", yandexKey)
                    .queryParam("text", q)
                    .queryParam("type", "geo,biz")
                    .queryParam("lang", "ru_RU")
                    .queryParam("results", 7);
            if (lat != null && lng != null) {
                builder.queryParam("ll", lng + "," + lat);
            }
            JsonNode root = getJson(builder.encode().build().toUri());
            JsonNode features = root == null ? null : root.path("features");
            if (features == null || !features.isArray()) return List.of();
            List<GeoHit> hits = new ArrayList<>();
            for (JsonNode feature : features) {
                GeoHit hit = fromYandexPlaces(feature);
                if (hit != null) hits.add(hit);
            }
            return hits;
        } catch (Exception ex) {
            log.warn("Yandex geosearch failed: {}", ex.getMessage());
            return List.of();
        }
    }

    private List<GeoHit> yandexGeocode(String q, Double lat, Double lng) {
        try {
            var builder = UriComponentsBuilder.fromUriString("https://geocode-maps.yandex.ru/1.x/")
                    .queryParam("apikey", yandexKey)
                    .queryParam("geocode", q)
                    .queryParam("format", "json")
                    .queryParam("lang", "ru_RU")
                    .queryParam("results", 7);
            if (lat != null && lng != null) {
                builder.queryParam("ll", lng + "," + lat);
            }
            JsonNode root = getJson(builder.encode().build().toUri());
            return fromYandexCollection(root);
        } catch (Exception ex) {
            log.warn("Yandex geocoder failed: {}", ex.getMessage());
            return List.of();
        }
    }

    private GeoHit fromYandexPlaces(JsonNode feature) {
        JsonNode coords = feature.path("geometry").path("coordinates");
        if (!coords.isArray() || coords.size() < 2) return null;
        double lng = coords.get(0).asDouble(Double.NaN);
        double lat = coords.get(1).asDouble(Double.NaN);
        if (!Double.isFinite(lat) || !Double.isFinite(lng)) return null;
        JsonNode props = feature.path("properties");
        String name = text(props.path("name"));
        String description = text(props.path("description"));
        if (name.isBlank()) name = text(props.path("CompanyMetaData").path("name"));
        if (name.isBlank()) return null;
        if (description.equals(name)) description = "";
        String kind = text(props.path("CompanyMetaData").path("Categories").path(0).path("class"));
        if (kind.isBlank()) kind = text(props.path("CompanyMetaData").path("Categories").path(0).path("name"));
        if (kind.isBlank()) kind = text(props.path("GeocoderMetaData").path("kind"));
        return new GeoHit(name, description.isBlank() ? null : description, lat, lng, yandexPlacesBbox(props.path("boundedBy")), kind.isBlank() ? null : kind);
    }

    private static List<Double> yandexPlacesBbox(JsonNode node) {
        if (!node.isArray() || node.size() < 2) return null;
        JsonNode sw = node.get(0);
        JsonNode ne = node.get(1);
        if (!sw.isArray() || sw.size() < 2 || !ne.isArray() || ne.size() < 2) return null;
        double west = sw.get(0).asDouble(Double.NaN);
        double south = sw.get(1).asDouble(Double.NaN);
        double east = ne.get(0).asDouble(Double.NaN);
        double north = ne.get(1).asDouble(Double.NaN);
        if (!Double.isFinite(south) || !Double.isFinite(north) || !Double.isFinite(west) || !Double.isFinite(east)) {
            return null;
        }
        return List.of(south, north, west, east);
    }

    private static List<GeoHit> mergeHits(List<GeoHit> first, List<GeoHit> second) {
        List<GeoHit> out = new ArrayList<>();
        var seen = new java.util.HashSet<String>();
        for (GeoHit hit : first) addHit(out, seen, hit);
        for (GeoHit hit : second) addHit(out, seen, hit);
        return out;
    }

    private static void addHit(List<GeoHit> out, java.util.Set<String> seen, GeoHit hit) {
        if (hit == null || out.size() >= 8) return;
        String key = hit.name().toLowerCase(Locale.ROOT) + "|"
                + Math.round(hit.lat() * 1000) + "|" + Math.round(hit.lng() * 1000);
        if (!seen.add(key)) return;
        out.add(hit);
    }

    private GeoHit yandexReverse(double lat, double lng) {
        if (yandexKey.isBlank()) return null;
        try {
            var uri = UriComponentsBuilder.fromUriString("https://geocode-maps.yandex.ru/1.x/")
                    .queryParam("apikey", yandexKey)
                    .queryParam("geocode", lng + "," + lat)
                    .queryParam("format", "json")
                    .queryParam("lang", "ru_RU")
                    .queryParam("results", 1)
                    .encode()
                    .build()
                    .toUri();
            List<GeoHit> hits = fromYandexCollection(getJson(uri));
            if (hits.isEmpty()) return null;
            GeoHit hit = hits.getFirst();
            return new GeoHit(hit.name(), hit.description(), lat, lng, hit.bbox(), hit.kind());
        } catch (Exception ex) {
            log.warn("Yandex reverse failed: {}", ex.getMessage());
            return null;
        }
    }

    private List<GeoHit> fromYandexCollection(JsonNode root) {
        JsonNode members = root == null
                ? null
                : root.path("response").path("GeoObjectCollection").path("featureMember");
        if (members == null || members.isMissingNode() || members.isNull()) return List.of();
        List<GeoHit> hits = new ArrayList<>();
        if (members.isArray()) {
            for (JsonNode member : members) {
                GeoHit hit = fromYandex(member.path("GeoObject"));
                if (hit != null) hits.add(hit);
            }
        } else if (members.isObject()) {
            GeoHit hit = fromYandex(members.path("GeoObject"));
            if (hit != null) hits.add(hit);
        }
        return hits;
    }

    private GeoHit fromYandex(JsonNode obj) {
        if (obj == null || obj.isMissingNode() || obj.isNull()) return null;
        String[] pos = text(obj.path("Point").path("pos")).split("\\s+");
        if (pos.length < 2) return null;
        double lng = parseDouble(pos[0]);
        double lat = parseDouble(pos[1]);
        if (!Double.isFinite(lat) || !Double.isFinite(lng)) return null;
        String name = text(obj.path("name"));
        String description = text(obj.path("description"));
        if (name.isBlank()) {
            name = text(obj.path("metaDataProperty").path("GeocoderMetaData").path("text"));
        }
        if (name.isBlank()) return null;
        if (description.equals(name)) description = "";
        String kind = text(obj.path("metaDataProperty").path("GeocoderMetaData").path("kind"));
        List<Double> bbox = yandexBbox(obj.path("boundedBy").path("Envelope"));
        return new GeoHit(name, description.isBlank() ? null : description, lat, lng, bbox, kind.isBlank() ? null : kind);
    }

    private static List<Double> yandexBbox(JsonNode envelope) {
        String[] lower = text(envelope.path("lowerCorner")).split("\\s+");
        String[] upper = text(envelope.path("upperCorner")).split("\\s+");
        if (lower.length < 2 || upper.length < 2) return null;
        double west = parseDouble(lower[0]);
        double south = parseDouble(lower[1]);
        double east = parseDouble(upper[0]);
        double north = parseDouble(upper[1]);
        if (!Double.isFinite(south) || !Double.isFinite(north) || !Double.isFinite(west) || !Double.isFinite(east)) {
            return null;
        }
        return List.of(south, north, west, east);
    }

    private List<GeoHit> mapboxSearch(String q, Double lat, Double lng) {
        if (mapboxToken.isBlank()) return List.of();
        try {
            var builder = UriComponentsBuilder
                    .fromUriString("https://api.mapbox.com/geocoding/v5/mapbox.places/{query}.json")
                    .queryParam("access_token", mapboxToken)
                    .queryParam("language", "ru")
                    .queryParam("country", "ru")
                    .queryParam("limit", 7)
                    .queryParam("types", "poi,place,locality,neighborhood,address,region,district");
            if (lat != null && lng != null) {
                builder.queryParam("proximity", lng + "," + lat);
            }
            JsonNode root = getJson(builder.buildAndExpand(q).encode().toUri());
            return fromMapboxFeatures(root);
        } catch (Exception ex) {
            log.warn("Mapbox geocoding failed: {}", ex.getMessage());
            return List.of();
        }
    }

    private GeoHit mapboxReverse(double lat, double lng) {
        if (mapboxToken.isBlank()) return null;
        try {
            var uri = UriComponentsBuilder
                    .fromUriString("https://api.mapbox.com/geocoding/v5/mapbox.places/" + lng + "," + lat + ".json")
                    .queryParam("access_token", mapboxToken)
                    .queryParam("language", "ru")
                    .queryParam("limit", 1)
                    .queryParam("types", "poi,place,locality,neighborhood,address,region,district")
                    .build(true)
                    .toUri();
            List<GeoHit> hits = fromMapboxFeatures(getJson(uri));
            if (hits.isEmpty()) return null;
            GeoHit hit = hits.getFirst();
            return new GeoHit(hit.name(), hit.description(), lat, lng, hit.bbox(), hit.kind());
        } catch (Exception ex) {
            log.warn("Mapbox reverse failed: {}", ex.getMessage());
            return null;
        }
    }

    private List<GeoHit> fromMapboxFeatures(JsonNode root) {
        JsonNode features = root == null ? null : root.path("features");
        if (features == null || !features.isArray()) return List.of();
        List<GeoHit> hits = new ArrayList<>();
        for (JsonNode feature : features) {
            GeoHit hit = fromMapbox(feature);
            if (hit != null) hits.add(hit);
        }
        return hits;
    }

    private GeoHit fromMapbox(JsonNode feature) {
        JsonNode center = feature.path("center");
        if (!center.isArray() || center.size() < 2) return null;
        double lng = center.get(0).asDouble(Double.NaN);
        double lat = center.get(1).asDouble(Double.NaN);
        if (!Double.isFinite(lat) || !Double.isFinite(lng)) return null;
        String name = text(feature.path("text"));
        String placeName = text(feature.path("place_name"));
        if (name.isBlank()) name = placeName;
        if (name.isBlank()) return null;
        String description = placeName;
        if (!placeName.isBlank() && placeName.startsWith(name)) {
            description = placeName.substring(name.length()).replaceFirst("^,\\s*", "");
        }
        if (description.equals(name)) description = "";
        String kind = "";
        JsonNode types = feature.path("place_type");
        if (types.isArray() && !types.isEmpty()) kind = text(types.get(0));
        List<Double> bbox = mapboxBbox(feature.path("bbox"));
        return new GeoHit(name, description.isBlank() ? null : description, lat, lng, bbox, kind.isBlank() ? null : kind);
    }

    private static List<Double> mapboxBbox(JsonNode node) {
        if (!node.isArray() || node.size() < 4) return null;
        return List.of(
                node.get(1).asDouble(),
                node.get(3).asDouble(),
                node.get(0).asDouble(),
                node.get(2).asDouble()
        );
    }

    private GeoHit nominatimReverse(double lat, double lng) {
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

    private static double parseDouble(String value) {
        try {
            return Double.parseDouble(value);
        } catch (NumberFormatException ex) {
            return Double.NaN;
        }
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
