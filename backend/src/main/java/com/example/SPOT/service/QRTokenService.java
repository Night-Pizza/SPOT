package com.example.SPOT.service;

import java.util.List;
import java.util.UUID;

import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.example.SPOT.config.CacheConfig;
import com.example.SPOT.exception.CustomException;
import com.example.SPOT.model.SessionModel;
import com.example.SPOT.repository.SessionRepository;

@Service
public class QRTokenService {
    private final CacheManager cacheManager;
    private final SimpMessagingTemplate messageTemplate;
    private final SessionRepository sessionRepository;

    public QRTokenService(CacheManager cacheManager, SimpMessagingTemplate messageTemplate, SessionRepository sessionRepository){
        this.cacheManager = cacheManager;
        this.messageTemplate = messageTemplate;
        this.sessionRepository = sessionRepository;
    }

    // Generates a new random UUID token, maps it to the session ID in the temporary cache,
    // and broadcasts the new token to subscribed clients via WebSockets for dynamic QR updates.
    public String convertAndSend(Long sessionId){
        SessionModel session = sessionRepository.findById(sessionId)
            .orElseThrow(() -> new CustomException("SESSION_ID_NOT_EXIST", "Session id does not exist"));
        String token = UUID.randomUUID().toString();
        Cache cache = cacheManager.getCache(CacheConfig.QR_TOKEN_CACHE);
        if (cache != null) cache.put(token, sessionId);

        String ownerId = session.getOwner().getId().toString();
        messageTemplate.convertAndSendToUser(
            ownerId,
            "/queue/session/" + sessionId + "/qr",
            token
        );

        return token;
    }

    // Validates a scanned QR token by checking if it exists in the active cache.
    // If valid, it returns the associated session ID; otherwise, it throws an exception to reject expired or invalid tokens.
    public Long validateTokenAndGetSesionId(String token){
        Cache cache = cacheManager.getCache(CacheConfig.QR_TOKEN_CACHE);

        if (cache != null) {
            Long sessionId = cache.get(token, Long.class);
            if (sessionId != null) return sessionId;
        }

        throw new CustomException("TOKEN_NOT_ACCEPTED", "Token is not up to date or is not valid");
    }

    // Scheduled background task that runs every 2000 milliseconds (2 seconds).
    // It automatically refreshes the QR token for all currently active sessions, enhancing security against token replay attacks.
    @Scheduled(fixedRate = 2000)
    public void updateAllActiveTokens(){
        List<Long> activeIds = sessionRepository.findAllActiveIds();

        activeIds.forEach(id -> convertAndSend(id));
    }
}
