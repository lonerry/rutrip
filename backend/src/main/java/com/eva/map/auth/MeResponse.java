package com.eva.map.auth;

import java.util.UUID;

public record MeResponse(UUID id, String email, String displayName, String avatarUrl, String mapColor) {
}
