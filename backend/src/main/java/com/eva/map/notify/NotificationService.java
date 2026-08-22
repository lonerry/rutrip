package com.eva.map.notify;

import com.eva.map.auth.AuthService;
import com.eva.map.user.User;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @Transactional
    public void friendRequest(User recipient, User actor) {
        if (notificationRepository.existsByUserIdAndActorIdAndTypeAndReadFalse(
                recipient.getId(), actor.getId(), NotificationType.FRIEND_REQUEST)) {
            return;
        }
        save(recipient, actor, NotificationType.FRIEND_REQUEST);
    }

    @Transactional
    public void friendAccepted(User recipient, User actor) {
        notificationRepository.deleteByPairAndType(recipient.getId(), actor.getId(), NotificationType.FRIEND_REQUEST);
        save(recipient, actor, NotificationType.FRIEND_ACCEPTED);
    }

    @Transactional
    public void clearFriendRequest(User recipient, User actor) {
        notificationRepository.deleteByPairAndType(recipient.getId(), actor.getId(), NotificationType.FRIEND_REQUEST);
    }

    @Transactional(readOnly = true)
    public NotificationFeedResponse list(User user) {
        List<NotificationResponse> items = notificationRepository
                .findTop30ByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(this::toResponse)
                .toList();
        return new NotificationFeedResponse(items, notificationRepository.countByUserIdAndReadFalse(user.getId()));
    }

    @Transactional
    public NotificationFeedResponse markAllRead(User user) {
        notificationRepository.markAllRead(user.getId());
        return list(user);
    }

    private void save(User recipient, User actor, NotificationType type) {
        Notification notification = new Notification();
        notification.setUser(recipient);
        notification.setActor(actor);
        notification.setType(type);
        notification.setRead(false);
        notificationRepository.save(notification);
    }

    private NotificationResponse toResponse(Notification notification) {
        User actor = notification.getActor();
        return new NotificationResponse(
                notification.getId(),
                notification.getType().name(),
                notification.isRead(),
                notification.getCreatedAt(),
                new NotificationResponse.Actor(actor.getId(), actor.getDisplayName(), AuthService.avatarUrl(actor))
        );
    }
}
