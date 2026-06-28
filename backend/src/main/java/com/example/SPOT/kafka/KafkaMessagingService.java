package com.example.SPOT.kafka;

import com.example.SPOT.exception.CustomException;
import com.example.SPOT.model.EmbeddingStatus;
import com.example.SPOT.model.KafkaModel;
import com.example.SPOT.model.UserModel;
import com.example.SPOT.repository.KafkaRepository;
import com.example.SPOT.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class KafkaMessagingService {
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;
    private final KafkaRepository kafkaRepository;
    private final UserRepository userRepository;

    @Value("${kafka.topic.faceRecognitionRequests}")
    private String faceRecognitionRequestsTopic;

    public KafkaMessagingService(KafkaTemplate<String, String> kafkaTemplate, ObjectMapper objectMapper, KafkaRepository kafkaRepository, UserRepository userRepository) {
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper;
        this.kafkaRepository = kafkaRepository;
        this.userRepository = userRepository;
    }

    public void dispatchFace(Long userId, String imageBase64) {
        if (kafkaRepository.findByUserId(userId) == null) {
            return;
        }

        try {
            Map<String, Object> payload = Map.of(
                    "user_id", userId,
                    "image_base64", imageBase64
            );
            String message = objectMapper.writeValueAsString(payload);
            kafkaTemplate.send(faceRecognitionRequestsTopic, message);
        } catch (Exception e) {
            throw new RuntimeException("Failed to send Kafka message", e);
        }
    }

    @KafkaListener(topics = "${kafka.topic.systemEvents}", groupId = "spot-group")
    public void processFace(String payload) {
        try {
            Map<String, Object> response = objectMapper.readValue(payload, Map.class);
            Long userId = (Long) response.get("user_id");
            boolean success = (boolean) response.get("success");

            if (success) {
                Double[] embedding = ((List<Double>) response.get("embedding"))
                        .toArray(new Double[0]);
                updateEmbedding(userId, embedding);
            } else {
                String error = (String) response.get("error");
                handleError(userId, error);
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to process Kafka message", e);
        }
    }

    private void updateEmbedding(Long userId, Double[] embedding) {
        KafkaModel response = Optional.ofNullable(kafkaRepository.findByUserId(userId))
                .orElseThrow(() -> new CustomException("REQUEST_NOT_EXIST", "Pending request for " + userId + " does not exist"));

        UserModel user = userRepository.findById(userId) .orElseThrow(() -> new CustomException("ID_NOT_EXIST", "User id does not exist"));

        if (response.getStatus() == EmbeddingStatus.PENDING_FOR_DB) {
            user.setEmbedding(embedding);
        } else {
            if (calculateCosineSimilarity(user.getEmbedding(), embedding) < 0.6) {
                throw new CustomException("USER_NOT_IDENTIFIED", "User cannot be identified");
            }
        }
        kafkaRepository.delete(response);
    }

    private static double calculateCosineSimilarity(Double[] vectorA, Double[] vectorB) {
        if (vectorA.length != vectorB.length) {
            throw new IllegalArgumentException("Vectors must have the same length");
        }

        double dotProduct = 0.0;
        double normA = 0.0;
        double normB = 0.0;

        for (int i = 0; i < vectorA.length; i++) {
            dotProduct += vectorA[i] * vectorB[i];
            normA += vectorA[i] * vectorA[i];
            normB += vectorB[i] * vectorB[i];
        }

        if (normA == 0.0 || normB == 0.0) {
            return 0.0;
        }

        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }


    private void handleError(Long userId, String error) {
        throw new CustomException("EMBEDDING_PRODUCING_ERROR", "Cannot produce embedding for " + userId + " due to " + error);
    }
}