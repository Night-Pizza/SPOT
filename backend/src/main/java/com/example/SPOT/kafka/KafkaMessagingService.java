package com.example.SPOT.kafka;

import com.example.SPOT.exception.CustomException;
import com.example.SPOT.model.AttendanceModel;
import com.example.SPOT.model.EmbeddingStatus;
import com.example.SPOT.model.KafkaModel;
import com.example.SPOT.model.SessionModel;
import com.example.SPOT.model.UserModel;
import com.example.SPOT.repository.AttendanceRepository;
import com.example.SPOT.repository.KafkaRepository;
import com.example.SPOT.repository.SessionRepository;
import com.example.SPOT.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class KafkaMessagingService {
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;
    private final KafkaRepository kafkaRepository;
    private final UserRepository userRepository;
    private final AttendanceRepository attendanceRepository;
    private final SessionRepository sessionRepository;

    @Value("${kafka.topic.faceRecognitionRequests}")
    private String faceRecognitionRequestsTopic;

    public KafkaMessagingService(KafkaTemplate<String, String> kafkaTemplate, ObjectMapper objectMapper,
                                 KafkaRepository kafkaRepository, UserRepository userRepository,
                                 AttendanceRepository attendanceRepository, SessionRepository sessionRepository) {
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper;
        this.kafkaRepository = kafkaRepository;
        this.userRepository = userRepository;
        this.attendanceRepository = attendanceRepository;
        this.sessionRepository = sessionRepository;
    }

    public void dispatchFace(Long requestId, Long userId, String imageBase64) {
        if (kafkaRepository.findByUserId(userId) == null) {
            return;
        }

        try {
            Map<String, Object> payload = Map.of(
                    "request_id", requestId,
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
            Long requestId = ((Number) response.get("request_id")).longValue();
            Long userId = (Long) response.get("user_id");
            boolean success = (boolean) response.get("success");

            KafkaModel request = (KafkaModel) kafkaRepository.findById(requestId).orElse(null);
            if (request == null || request.getStatus() == EmbeddingStatus.SUCCESS || request.getStatus() == EmbeddingStatus.FAILED) {
                return;
            }

            UserModel user = userRepository.findById(userId).orElseThrow();

            if (request.getStatus() == EmbeddingStatus.PENDING_FOR_DB) {
                processDbRegistration(request, user, success, response);
            } else if (request.getStatus() == EmbeddingStatus.PENDING_FOR_ATTENDANCE) {
                processAttendance(request, user, success, response);
            }
        } catch (Exception e) {
            System.err.println("Failed to process Kafka message: " + e.getMessage());
        }
    }

    private void processDbRegistration(KafkaModel request, UserModel user, boolean success, Map<String, Object> response) {
        if (success) {
            Double[] embedding = ((List<Double>) response.get("embedding")).toArray(new Double[0]);
            user.setEmbedding(embedding);
            userRepository.save(user);
            request.setStatus(EmbeddingStatus.SUCCESS);
        } else {
            request.setStatus(EmbeddingStatus.FAILED);
            request.setErrorMessage((String) response.get("error"));
        }
        kafkaRepository.save(request);
    }

    private void processAttendance(KafkaModel request, UserModel user, boolean success, Map<String, Object> response) {
        boolean isMatch = false;
        if (success) {
            Double[] embedding = ((List<Double>) response.get("embedding")).toArray(new Double[0]);
            isMatch = calculateCosineSimilarity(user.getEmbedding(), embedding) >= 0.6;
        }

        if (isMatch) {
            request.setStatus(EmbeddingStatus.SUCCESS);
            kafkaRepository.save(request);

            SessionModel session = sessionRepository.findById(request.getSessionId()).orElseThrow();
            AttendanceModel attendance = new AttendanceModel(
                    null,
                    user,
                    session,
                    LocalDateTime.now()
            );
            attendanceRepository.save(attendance);
        } else {
            request.setAttempts(request.getAttempts() + 1);
            if (request.getAttempts() >= 3) {
                request.setStatus(EmbeddingStatus.FAILED);
                request.setErrorMessage("Face not recognized after 3 attempts");
            }
            kafkaRepository.save(request);
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