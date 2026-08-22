package com.eva.map.visit;

import com.eva.map.user.User;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/visits")
public class VisitController {

    private final VisitService visitService;

    public VisitController(VisitService visitService) {
        this.visitService = visitService;
    }

    @GetMapping
    public List<VisitResponse> list(@AuthenticationPrincipal User user) {
        return visitService.list(user);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public VisitResponse create(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody VisitRequest request
    ) {
        return visitService.create(user, request);
    }

    @PatchMapping("/{id}")
    public VisitResponse updateColor(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id,
            @Valid @RequestBody VisitColorRequest request
    ) {
        return visitService.updateColor(user, id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        visitService.delete(user, id);
    }
}
