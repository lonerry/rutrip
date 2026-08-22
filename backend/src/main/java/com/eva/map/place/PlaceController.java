package com.eva.map.place;

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
@RequestMapping("/api/places")
public class PlaceController {

    private final PlaceService placeService;

    public PlaceController(PlaceService placeService) {
        this.placeService = placeService;
    }

    @GetMapping
    public List<PlaceResponse> list(@AuthenticationPrincipal User user) {
        return placeService.list(user);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PlaceResponse create(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody PlaceRequest request
    ) {
        return placeService.create(user, request);
    }

    @PutMapping("/{id}")
    public PlaceResponse update(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id,
            @Valid @RequestBody PlaceRequest request
    ) {
        return placeService.update(user, id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        placeService.delete(user, id);
    }
}
