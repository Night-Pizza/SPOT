package com.example.SPOT.kafka;

import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

@Service
public class KafkaMessagingService {

    private final KafkaTemplate<String, String> kafkaTemplate;

    public KafkaMessagingService(KafkaTemplate<String, String> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public void dispatch(String topic, String payload) {
        kafkaTemplate.send(topic, payload);
    }

    @KafkaListener(topics = "system.events", groupId = "app-group")
    public void process(String payload) {
        System.out.println("Processed: " + payload);
    }
}