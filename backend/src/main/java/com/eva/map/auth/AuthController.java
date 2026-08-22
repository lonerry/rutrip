package com.eva.map.auth;

import com.eva.map.user.User;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @SecurityRequirements
    @PostMapping("/auth/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @SecurityRequirements
    @PostMapping("/auth/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @GetMapping("/me")
    public MeResponse me(@AuthenticationPrincipal User user) {
        return authService.me(user);
    }

    @PatchMapping("/me")
    public MeResponse update(@AuthenticationPrincipal User user, @Valid @RequestBody UpdateMeRequest request) {
        return authService.update(user, request);
    }

    @PostMapping(value = "/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public MeResponse avatar(@AuthenticationPrincipal User user, @RequestParam("file") MultipartFile file) {
        return authService.updateAvatar(user, file);
    }

    @DeleteMapping("/me/avatar")
    public MeResponse deleteAvatar(@AuthenticationPrincipal User user) {
        return authService.deleteAvatar(user);
    }

    @GetMapping("/avatars/{userId}")
    public ResponseEntity<org.springframework.core.io.Resource> avatarFile(
            @AuthenticationPrincipal User user,
            @PathVariable UUID userId
    ) {
        AuthService.LoadedAvatar avatar = authService.loadAvatar(userId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, avatar.contentType())
                .body(avatar.resource());
    }
}
