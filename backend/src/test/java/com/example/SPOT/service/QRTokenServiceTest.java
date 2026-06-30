package com.example.SPOT.service;

import com.example.SPOT.config.CacheConfig;
import com.example.SPOT.exception.CustomException;
import com.example.SPOT.repository.SessionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class QRTokenServiceTest {

    @Mock
    private CacheManager cacheManager;
    @Mock
    private SimpMessagingTemplate messageTemplate;
    @Mock
    private SessionRepository sessionRepository;
    
    @Mock
    private Cache cache;

    @InjectMocks
    private QRTokenService qrTokenService;

    private final Long SESSION_ID = 100L;
    private final String MOCK_TOKEN = "test-uuid-token";

    @BeforeEach
    void setUp() {
        lenient().when(cacheManager.getCache(anyString())).thenReturn(cache);
    }

    @Test
    void convertAndSend_Success() {
        String generatedToken = qrTokenService.convertAndSend(SESSION_ID);

        assertNotNull(generatedToken);
        assertFalse(generatedToken.isEmpty());

        verify(cache, times(1)).put(generatedToken, SESSION_ID);
        
        verify(messageTemplate, times(1))
                .convertAndSend(eq("/topic/session/" + SESSION_ID + "/qr"), eq(generatedToken));
    }

    @Test
    void validateTokenAndGetSessionId_Success() {
        when(cache.get(MOCK_TOKEN, Long.class)).thenReturn(SESSION_ID);

        Long result = qrTokenService.validateTokenAndGetSesionId(MOCK_TOKEN);

        assertEquals(SESSION_ID, result);
    }

    @Test
    void validateTokenAndGetSessionId_WhenTokenNotFound_ThrowsException() {
        when(cache.get(MOCK_TOKEN, Long.class)).thenReturn(null);

        CustomException exception = assertThrows(CustomException.class, 
                () -> qrTokenService.validateTokenAndGetSesionId(MOCK_TOKEN));
        
        assertEquals("TOKEN_NOT_ACCEPTED", exception.getErrorCode());
    }

    @Test
    void validateTokenAndGetSessionId_WhenCacheIsNull_ThrowsException() {
        when(cacheManager.getCache(anyString())).thenReturn(null);

        CustomException exception = assertThrows(CustomException.class, 
                () -> qrTokenService.validateTokenAndGetSesionId(MOCK_TOKEN));
        
        assertEquals("TOKEN_NOT_ACCEPTED", exception.getErrorCode());
    }

    @Test
    void updateAllActiveTokens_Success() {
        List<Long> activeSessions = List.of(10L, 20L, 30L);
        when(sessionRepository.findAllActiveIds()).thenReturn(activeSessions);

        qrTokenService.updateAllActiveTokens();

        verify(cache, times(3)).put(anyString(), anyLong());
        
        verify(messageTemplate, times(1)).convertAndSend(eq("/topic/session/10/qr"), anyString());
        verify(messageTemplate, times(1)).convertAndSend(eq("/topic/session/20/qr"), anyString());
        verify(messageTemplate, times(1)).convertAndSend(eq("/topic/session/30/qr"), anyString());
    }
}