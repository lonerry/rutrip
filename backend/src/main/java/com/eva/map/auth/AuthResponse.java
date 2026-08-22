package com.eva.map.auth;

import java.util.UUID;

public record AuthResponse(String token, UUID id, String email, String displayName, String avatarUrl, String mapColor) {
}
