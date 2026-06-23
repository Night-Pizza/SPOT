package com.example.SPOT.dto.request;

import jakarta.validation.constraints.NotNull;
import java.util.Map;

public record AttendanceCreateDTO (
        @NotNull(message ="Session id cannot be null")
        Long sessionId,

        Map<String, Object> payload
){}
