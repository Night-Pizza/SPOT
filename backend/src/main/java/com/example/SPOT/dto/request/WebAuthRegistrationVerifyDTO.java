package com.example.SPOT.dto.request;

import jakarta.validation.constraints.NotBlank;

public record WebAuthRegistrationVerifyDTO(
        @NotBlank(message = "Response JSON cannot be blank")
        String responseJson
) {}
