package com.eva.map.story;

import com.eva.map.user.User;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/stories")
public class StoryController {

    private final StoryService storyService;

    public StoryController(StoryService storyService) {
        this.storyService = storyService;
    }

    @GetMapping
    public List<StoryResponse> list(@AuthenticationPrincipal User user) {
        return storyService.list(user);
    }

    @GetMapping("/{id}")
    public StoryResponse get(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        return storyService.get(user, id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public StoryResponse create(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody StoryRequest request
    ) {
        return storyService.create(user, request);
    }

    @PutMapping("/{id}")
    public StoryResponse update(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id,
            @Valid @RequestBody StoryRequest request
    ) {
        return storyService.update(user, id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        storyService.delete(user, id);
    }
}
