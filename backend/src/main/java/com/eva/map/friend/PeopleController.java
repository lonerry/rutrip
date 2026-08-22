package com.eva.map.friend;

import com.eva.map.photo.PhotoResponse;
import com.eva.map.place.PlaceResponse;
import com.eva.map.region.RegionResponse;
import com.eva.map.story.StoryResponse;
import com.eva.map.user.User;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/people")
public class PeopleController {

    private final FriendshipService friendshipService;

    public PeopleController(FriendshipService friendshipService) {
        this.friendshipService = friendshipService;
    }

    @GetMapping
    public List<PersonResponse> search(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false, defaultValue = "") String q
    ) {
        return friendshipService.search(user, q);
    }

    @GetMapping("/{id}")
    public PersonResponse get(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        return friendshipService.get(user, id);
    }

    @GetMapping("/{id}/regions")
    public List<RegionResponse> regions(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        return friendshipService.regions(user, id);
    }

    @GetMapping("/{id}/stories")
    public List<StoryResponse> stories(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        return friendshipService.stories(user, id);
    }

    @GetMapping("/{id}/places")
    public List<PlaceResponse> places(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        return friendshipService.places(user, id);
    }

    @GetMapping("/{id}/photos")
    public List<PhotoResponse> photos(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        return friendshipService.photos(user, id);
    }
}
