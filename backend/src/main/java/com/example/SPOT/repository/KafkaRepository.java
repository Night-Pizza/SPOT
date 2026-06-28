package com.example.SPOT.repository;

import com.example.SPOT.model.EmbeddingStatus;
import com.example.SPOT.model.KafkaModel;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface KafkaRepository {

    KafkaModel findByUserId(Long userId);

    void save(KafkaModel kafkaRequest);

    void delete(KafkaModel response);

    Optional<Object> findById(Long requestId);
}
