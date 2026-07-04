package com.example.SPOT.repository;

import com.example.SPOT.model.KafkaModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface KafkaRepository extends JpaRepository<KafkaModel, Long> {

    KafkaModel findByUserId(Long userId);
}
