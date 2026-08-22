package com.eva.map.friend;

import com.eva.map.user.User;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/friends")
public class FriendController {

    private final FriendshipService friendshipService;

    public FriendController(FriendshipService friendshipService) {
        this.friendshipService = friendshipService;
    }

    @GetMapping
    public List<PersonResponse> list(@AuthenticationPrincipal User user) {
        return friendshipService.friends(user);
    }

    @GetMapping("/incoming")
    public List<PersonResponse> incoming(@AuthenticationPrincipal User user) {
        return friendshipService.incoming(user);
    }

    @PostMapping("/{userId}")
    @ResponseStatus(HttpStatus.CREATED)
    public PersonResponse request(@AuthenticationPrincipal User user, @PathVariable UUID userId) {
        return friendshipService.request(user, userId);
    }

    @PostMapping("/{userId}/accept")
    public PersonResponse accept(@AuthenticationPrincipal User user, @PathVariable UUID userId) {
        return friendshipService.accept(user, userId);
    }

    @DeleteMapping("/{userId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remove(@AuthenticationPrincipal User user, @PathVariable UUID userId) {
        friendshipService.remove(user, userId);
    }
}
