package com.example.SPOT.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "kafka_requests")
@AllArgsConstructor
@NoArgsConstructor
public class KafkaModel {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JoinColumn(name = "user_id", foreignKey = @ForeignKey(name = "user_id"))
    private Long userId;

    @Column(name = "session_id")
    private Long sessionId;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private EmbeddingStatus status;;

    @Column(name = "attempts", nullable = false)
    private Integer attempts = 0;

    @Column(name = "error_message")
    private String errorMessage;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}