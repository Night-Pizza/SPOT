package com.example.SPOT.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import com.example.SPOT.model.ValidationType;

public record SessionCreateDTO (
        @NotBlank(message = "Session title cannot be null or empty")
        String title,

        Double latitude,
        Double longitude,
        Double allowedRadius,

        List<ValidationType> validationTypes
){}
