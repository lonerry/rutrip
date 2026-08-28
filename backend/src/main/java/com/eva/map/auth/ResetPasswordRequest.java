package com.eva.map.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
        @NotBlank String email,
        @NotBlank @Size(min = 6, max = 64) String token,
        @NotBlank @Size(min = 8, max = 100) String password
) {
}
