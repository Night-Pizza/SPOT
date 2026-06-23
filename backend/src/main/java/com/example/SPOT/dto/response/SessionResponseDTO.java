package com.example.SPOT.dto.response;
import java.time.LocalDateTime;

public record SessionResponseDTO (
        Long id,
        String title,
        LocalDateTime createdAt
){}
