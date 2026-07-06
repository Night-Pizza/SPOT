package com.example.SPOT.service;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
public class RateLimitService {
    private final Cache<String, Bucket> buckets = Caffeine.newBuilder()
            .expireAfterAccess(Duration.ofMinutes(15))
            .maximumSize(100_000)
            .build();

    public boolean tryConsume(String key, long capacity, Duration period) {
        Bucket bucket = buckets.get(key, ignored -> newBucket(capacity, period));
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
