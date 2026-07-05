package com.example.SPOT.service;

import org.springframework.stereotype.Service;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RateLimitService {
    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    public boolean tryConsume(String key, long capacity, Duration period) {
        Bucket bucket = buckets.computeIfAbsent(key, ignored -> newBucket(capacity, period));
        return bucket.tryConsume(1);
    }

    private Bucket newBucket(long capacity, Duration period) {
        Bandwidth limit = Bandwidth.classic(
                capacity,
                Refill.intervally(capacity, period)
        );

        return Bucket.builder()
                .addLimit(limit)
                .build();
    }

}
