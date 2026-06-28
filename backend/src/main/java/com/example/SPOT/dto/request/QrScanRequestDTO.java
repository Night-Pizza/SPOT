package com.example.SPOT.dto.request;

import jakarta.validation.constraints.NotBlank;
import java.util.Map;

public record QrScanRequestDTO (
        @NotBlank(message = "Token cannot be empty")
        String token,

        Map<String, Object> payload
){}
