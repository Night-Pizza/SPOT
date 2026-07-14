package com.example.SPOT.dto.response;

public record UserDTO(
        Long id,
        String email,
        boolean faceRegistered,
        boolean webauthRegistered,
        boolean webauthVerified
){}