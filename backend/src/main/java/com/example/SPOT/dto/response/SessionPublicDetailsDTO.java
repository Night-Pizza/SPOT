package com.example.SPOT.dto.response;

import java.util.List;
import com.example.SPOT.model.ValidationType;

public record SessionPublicDetailsDTO(
    Long id,
    String title,
    List<ValidationType> validationTypes,
    Double latitude,
    Double longitude,
    Double allowedRadius,
    boolean isActive
) {}
