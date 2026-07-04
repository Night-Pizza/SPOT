package com.example.SPOT.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.Map;

public record EmailAttendanceRequestDTO (
        @NotNull(message ="Session id cannot be null")
        Long sessionId,

        @NotBlank(message = "Email cannot be null or empty")
        String email
){}
