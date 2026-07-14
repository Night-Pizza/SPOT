package com.example.SPOT.dto.response;
import java.time.LocalDateTime;

public record UserAttendanceDTO (
        Long id,
        String title,
        String ownerEmail,
        LocalDateTime timestamp,
        Boolean isActive
){}
