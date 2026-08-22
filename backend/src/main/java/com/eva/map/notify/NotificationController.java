package com.eva.map.notify;

import com.eva.map.user.User;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public NotificationFeedResponse list(@AuthenticationPrincipal User user) {
        return notificationService.list(user);
    }

    @PostMapping("/read")
    public NotificationFeedResponse readAll(@AuthenticationPrincipal User user) {
        return notificationService.markAllRead(user);
    }
}
