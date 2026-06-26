package com.example.SPOT.dto.request;

import jakarta.validation.constraints.NotBlank;

import java.util.Map;

public class AddFaceDTO {
    @NotBlank
    Map<String, Object> payload;
}
