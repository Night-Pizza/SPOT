package com.example.SPOT.dto.response;

import com.example.SPOT.model.EmbeddingStatus;

public record FaceResponseDTO(
        Long requestId,
        EmbeddingStatus status
){}