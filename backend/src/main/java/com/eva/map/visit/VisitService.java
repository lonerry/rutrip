package com.eva.map.visit;

import com.eva.map.common.BadRequestException;
import com.eva.map.common.ConflictException;
import com.eva.map.common.NotFoundException;
import com.eva.map.region.Region;
import com.eva.map.region.RegionRepository;
import com.eva.map.user.User;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class VisitService {

    public static final String DEFAULT_COLOR = "#3b82f6";

    private final VisitRepository visitRepository;
    private final RegionRepository regionRepository;

    public VisitService(VisitRepository visitRepository, RegionRepository regionRepository) {
        this.visitRepository = visitRepository;
        this.regionRepository = regionRepository;
    }

    @Transactional(readOnly = true)
    public Set<UUID> visitedRegionIds(UUID userId) {
        return new HashSet<>(visitRepository.findVisitedRegionIdsByUserId(userId));
    }

    @Transactional(readOnly = true)
    public Map<UUID, VisitMarker> markersByRegionId(UUID userId) {
        return visitRepository.findAllByUserIdWithRegion(userId).stream()
                .collect(Collectors.toMap(
                        visit -> visit.getRegion().getId(),
                        visit -> new VisitMarker(visit.getId(), normalizeColor(visit.getColor()))
                ));
    }

    @Transactional(readOnly = true)
    public List<VisitResponse> list(User user) {
        return visitRepository.findAllByUserIdWithRegion(user.getId()).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public VisitResponse create(User user, VisitRequest request) {
        Region region = resolveRegion(request);
        if (visitRepository.existsByUserIdAndRegionId(user.getId(), region.getId())) {
            throw new ConflictException("Region is already marked as visited");
        }
        Visit visit = new Visit();
        visit.setUser(user);
        visit.setRegion(region);
        visit.setVisitedAt(request.visitedAt());
        visit.setNote(request.note());
        visit.setColor(normalizeColor(request.color() != null ? request.color() : user.getMapColor()));
        visitRepository.save(visit);
        return toResponse(visit);
    }

    @Transactional
    public VisitResponse updateColor(User user, UUID visitId, VisitColorRequest request) {
        Visit visit = visitRepository.findByIdAndUserId(visitId, user.getId())
                .orElseThrow(() -> new NotFoundException("Visit not found"));
        visit.setColor(normalizeColor(request.color()));
        return toResponse(visit);
    }

    @Transactional
    public void delete(User user, UUID visitId) {
        Visit visit = visitRepository.findByIdAndUserId(visitId, user.getId())
                .orElseThrow(() -> new NotFoundException("Visit not found"));
        visitRepository.delete(visit);
    }

    private Region resolveRegion(VisitRequest request) {
        if (request.regionId() != null) {
            return regionRepository.findById(request.regionId())
                    .orElseThrow(() -> new NotFoundException("Region not found"));
        }
        if (request.regionCode() != null && !request.regionCode().isBlank()) {
            return regionRepository.findByCodeIgnoreCase(request.regionCode().trim())
                    .orElseThrow(() -> new NotFoundException("Region not found"));
        }
        throw new BadRequestException("regionId or regionCode is required");
    }

    private VisitResponse toResponse(Visit visit) {
        Region region = visit.getRegion();
        return new VisitResponse(
                visit.getId(),
                region.getId(),
                region.getCode(),
                region.getName(),
                visit.getVisitedAt(),
                visit.getNote(),
                normalizeColor(visit.getColor())
        );
    }

    public static String normalizeColor(String color) {
        if (color == null || !color.matches("^#[0-9A-Fa-f]{6}$")) {
            return DEFAULT_COLOR;
        }
        return color.toLowerCase(Locale.ROOT);
    }

    public record VisitMarker(UUID id, String color) {
    }
}
