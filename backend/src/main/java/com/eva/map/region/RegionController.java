package com.eva.map.region;

import com.eva.map.user.User;
import com.eva.map.visit.VisitService;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/regions")
public class RegionController {

    private final RegionRepository regionRepository;
    private final VisitService visitService;

    public RegionController(RegionRepository regionRepository, VisitService visitService) {
        this.regionRepository = regionRepository;
        this.visitService = visitService;
    }

    @GetMapping
    public List<RegionResponse> list(@AuthenticationPrincipal User user) {
        Map<UUID, VisitService.VisitMarker> visits = visitService.markersByRegionId(user.getId());
        return regionRepository.findAllByOrderByNameAsc().stream()
                .map(region -> {
                    VisitService.VisitMarker visit = visits.get(region.getId());
                    return new RegionResponse(
                            region.getId(),
                            region.getCode(),
                            region.getName(),
                            region.getType(),
                            visit != null,
                            visit == null ? null : visit.id(),
                            visit == null ? null : visit.color()
                    );
                })
                .toList();
    }
}
