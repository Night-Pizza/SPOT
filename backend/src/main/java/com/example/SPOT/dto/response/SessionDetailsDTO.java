package com.example.SPOT.dto.response;

import java.time.LocalDateTime;
import java.util.List;
import com.example.SPOT.model.ValidationType;

public record SessionDetailsDTO(
    Long id,
    String title,
    String password,
    List<ValidationType> validationTypes,
    Double latitude,
    Double longitude,
    Double allowedRadius,
    LocalDateTime createdAt,
    boolean isActive
) {}
