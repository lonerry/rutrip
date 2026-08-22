package com.eva.map.notify;

import java.util.List;

public record NotificationFeedResponse(
        List<NotificationResponse> items,
        long unreadCount
) {
}
