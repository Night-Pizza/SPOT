package com.example.SPOT.dto.response;

public record PollingStatusDTO(
        String status,
        String errorMessage
) {}
