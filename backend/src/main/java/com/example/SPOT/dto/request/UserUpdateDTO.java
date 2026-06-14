package com.example.SPOT.dto.request;

import jakarta.validation.constraints.NotBlank;

public record UserUpdateDTO(
        @NotBlank(message = "Password cannot be empty")
        String currentPassword,

        @NotBlank(message = "New Password cannot be empty")
        String newPassword
){}
