package com.example.SPOT.dto.request;

import jakarta.validation.constraints.NotBlank;

import java.util.Map;

public record AddFaceDTO (
    @NotBlank
    String image
) {}
