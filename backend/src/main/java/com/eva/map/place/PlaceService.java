package com.eva.map.place;

import com.eva.map.common.NotFoundException;
import com.eva.map.region.Region;
import com.eva.map.region.RegionRepository;
import com.eva.map.user.User;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PlaceService {

    private final PlaceRepository placeRepository;
    private final RegionRepository regionRepository;

    public PlaceService(PlaceRepository placeRepository, RegionRepository regionRepository) {
        this.placeRepository = placeRepository;
        this.regionRepository = regionRepository;
    }

    @Transactional(readOnly = true)
    public List<PlaceResponse> list(User user) {
        return listFor(user.getId());
    }

    @Transactional(readOnly = true)
    public List<PlaceResponse> listFor(UUID userId) {
        return placeRepository.findAllByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public PlaceResponse create(User user, PlaceRequest request) {
        Place place = new Place();
        place.setUser(user);
        apply(place, request);
        placeRepository.save(place);
        return toResponse(place);
    }

    @Transactional
    public PlaceResponse update(User user, UUID id, PlaceRequest request) {
        Place place = requireOwned(user, id);
        apply(place, request);
        return toResponse(place);
    }

    @Transactional
    public void delete(User user, UUID id) {
        placeRepository.delete(requireOwned(user, id));
    }

    private void apply(Place place, PlaceRequest request) {
        place.setTitle(request.title().trim());
        place.setDescription(request.description());
        place.setLat(request.lat());
        place.setLng(request.lng());
        place.setRegion(resolveRegion(request.regionId()));
    }

    private Region resolveRegion(UUID regionId) {
        if (regionId == null) {
            return null;
        }
        return regionRepository.findById(regionId)
                .orElseThrow(() -> new NotFoundException("Region not found"));
    }

    private Place requireOwned(User user, UUID id) {
        return placeRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new NotFoundException("Place not found"));
    }

    private PlaceResponse toResponse(Place place) {
        return new PlaceResponse(
                place.getId(),
                place.getTitle(),
                place.getDescription(),
                place.getLat(),
                place.getLng(),
                place.getRegion() == null ? null : place.getRegion().getId()
        );
    }
}
