package com.eva.map.visit;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record VisitColorRequest(
        @NotBlank @Pattern(regexp = "^#[0-9A-Fa-f]{6}$") String color
) {
}
