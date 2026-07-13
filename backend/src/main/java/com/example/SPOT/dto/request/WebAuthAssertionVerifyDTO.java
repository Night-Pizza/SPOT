package com.example.SPOT.dto.request;

import jakarta.validation.constraints.NotBlank;

public record WebAuthAssertionVerifyDTO(
        @NotBlank(message = "Response JSON cannot be blank")
        String responseJson,
        
        @NotBlank(message = "Device fingerprint cannot be blank")
        String deviceFingerprint
) {}
