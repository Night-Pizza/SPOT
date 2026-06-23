package com.example.SPOT.dto.response;
import java.time.LocalDateTime;

public record AttendanceResponseDTO (
        Long id,
        LocalDateTime timestamp
){}
