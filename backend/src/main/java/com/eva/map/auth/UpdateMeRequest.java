package com.eva.map.auth;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateMeRequest(
        @Size(min = 2, max = 100) String displayName,
        @Pattern(regexp = "^#[0-9A-Fa-f]{6}$") String mapColor
) {
}
