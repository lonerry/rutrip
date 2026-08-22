package com.eva.map.story;

import com.eva.map.common.NotFoundException;
import com.eva.map.place.Place;
import com.eva.map.place.PlaceRepository;
import com.eva.map.region.Region;
import com.eva.map.region.RegionRepository;
import com.eva.map.user.User;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StoryService {

    private final StoryRepository storyRepository;
    private final RegionRepository regionRepository;
    private final PlaceRepository placeRepository;

    public StoryService(
            StoryRepository storyRepository,
            RegionRepository regionRepository,
            PlaceRepository placeRepository
    ) {
        this.storyRepository = storyRepository;
        this.regionRepository = regionRepository;
        this.placeRepository = placeRepository;
    }

    @Transactional(readOnly = true)
    public List<StoryResponse> list(User user) {
        return listFor(user.getId());
    }

    @Transactional(readOnly = true)
    public List<StoryResponse> listFor(UUID userId) {
        return storyRepository.findAllByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public long countFor(UUID userId) {
        return storyRepository.countByUserId(userId);
    }

    @Transactional(readOnly = true)
    public StoryResponse get(User user, UUID id) {
        return toResponse(requireOwned(user, id));
    }

    @Transactional
    public StoryResponse create(User user, StoryRequest request) {
        Story story = new Story();
        story.setUser(user);
        apply(user, story, request);
        storyRepository.save(story);
        return toResponse(story);
    }

    @Transactional
    public StoryResponse update(User user, UUID id, StoryRequest request) {
        Story story = requireOwned(user, id);
        apply(user, story, request);
        return toResponse(story);
    }

    @Transactional
    public void delete(User user, UUID id) {
        storyRepository.delete(requireOwned(user, id));
    }

    private void apply(User user, Story story, StoryRequest request) {
        story.setTitle(request.title().trim());
        story.setBody(request.body());
        story.setRegion(resolveRegion(request.regionId()));
        story.setPlace(resolvePlace(user, request.placeId()));
    }

    private Region resolveRegion(UUID regionId) {
        if (regionId == null) {
            return null;
        }
        return regionRepository.findById(regionId)
                .orElseThrow(() -> new NotFoundException("Region not found"));
    }

    private Place resolvePlace(User user, UUID placeId) {
        if (placeId == null) {
            return null;
        }
        return placeRepository.findByIdAndUserId(placeId, user.getId())
                .orElseThrow(() -> new NotFoundException("Place not found"));
    }

    private Story requireOwned(User user, UUID id) {
        return storyRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new NotFoundException("Story not found"));
    }

    private StoryResponse toResponse(Story story) {
        return new StoryResponse(
                story.getId(),
                story.getTitle(),
                story.getBody(),
                story.getRegion() == null ? null : story.getRegion().getId(),
                story.getPlace() == null ? null : story.getPlace().getId(),
                story.getCreatedAt()
        );
    }
}
