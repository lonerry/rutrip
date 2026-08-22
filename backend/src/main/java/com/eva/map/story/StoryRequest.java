package com.eva.map.story;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record StoryRequest(
        @NotBlank @Size(max = 200) String title,
        @NotBlank String body,
        UUID regionId,
        UUID placeId
) {
}
