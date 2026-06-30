package com.example.SPOT.service;

import com.example.SPOT.dto.request.SessionCreateDTO;
import com.example.SPOT.dto.request.SessionUpdateDTO;
import com.example.SPOT.dto.response.SessionResponseDTO;
import com.example.SPOT.exception.CustomException;
import com.example.SPOT.model.SessionModel;
import com.example.SPOT.model.UserModel;
import com.example.SPOT.repository.AttendanceRepository;
import com.example.SPOT.repository.SessionRepository;
import com.example.SPOT.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SessionServiceTest {

    @Mock
    private SessionRepository sessionRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private AttendanceRepository attendanceRepository;

    @InjectMocks
    private SessionService sessionService;

    private final Long USER_ID = 1L;
    private final Long SESSION_ID = 100L;
    private UserModel owner;
    private SessionModel session;

    @BeforeEach
    void setUp() {
        owner = new UserModel();
        owner.setId(USER_ID);

        session = new SessionModel();
        session.setId(SESSION_ID);
        session.setTitle("Test Math Session");
        session.setOwner(owner);
        session.setActive(true);
        session.setCreateAt(LocalDateTime.now());
    }

    @Test
    void createSession_Success() {
        SessionCreateDTO request = new SessionCreateDTO(
                "Test Math Session", 
                55.7558, 
                37.6173, 
                100.0, 
                "secret", 
                null
        );

        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(owner));
        when(sessionRepository.save(any(SessionModel.class))).thenAnswer(invocation -> {
            SessionModel savedSession = invocation.getArgument(0);
            savedSession.setId(SESSION_ID); // Имитируем генерацию ID в базе
            return savedSession;
        });

        SessionResponseDTO response = sessionService.createSession(request, USER_ID);

        assertNotNull(response);
        assertEquals(SESSION_ID, response.id());
        assertEquals("Test Math Session", response.title());
        verify(sessionRepository, times(1)).save(any(SessionModel.class));
    }

    @Test
    void createSession_OwnerDoesNotExist_ThrowsException() {
        SessionCreateDTO request = new SessionCreateDTO("Title", 0.0, 0.0, 0.0, null, null);
        when(userRepository.findById(USER_ID)).thenReturn(Optional.empty());

        CustomException exception = assertThrows(CustomException.class, 
                () -> sessionService.createSession(request, USER_ID));
        assertEquals("OWNER_ID_NOT_EXIST", exception.getErrorCode());
        verify(sessionRepository, never()).save(any());
    }

    @Test
    void deleteSession_Success() {
        when(sessionRepository.existsById(SESSION_ID)).thenReturn(true);

        sessionService.deleteSession(SESSION_ID);

        verify(attendanceRepository, times(1)).deleteBySessionId(SESSION_ID);
        verify(sessionRepository, times(1)).deleteById(SESSION_ID);
    }

    @Test
    void deleteSession_WhenSessionDoesNotExist_ThrowsException() {
        when(sessionRepository.existsById(SESSION_ID)).thenReturn(false);

        CustomException exception = assertThrows(CustomException.class, 
                () -> sessionService.deleteSession(SESSION_ID));
        assertEquals("ID_NOT_EXIST", exception.getErrorCode());
        verify(attendanceRepository, never()).deleteBySessionId(anyLong());
    }

    @Test
    void updateSessionName_Success() {
        SessionUpdateDTO request = new SessionUpdateDTO("New Title");
        when(sessionRepository.findById(SESSION_ID)).thenReturn(Optional.of(session));

        sessionService.updateSessionName(SESSION_ID, request);


        assertEquals("New Title", session.getTitle());
    }

    @Test
    void closeSession_Success() {
        when(sessionRepository.findById(SESSION_ID)).thenReturn(Optional.of(session));

        sessionService.closeSession(SESSION_ID);

        assertFalse(session.isActive());
    }

    @Test
    void closeSession_WhenAlreadyClosed_ThrowsException() {
        session.setActive(false); // Сессия УЖЕ закрыта
        when(sessionRepository.findById(SESSION_ID)).thenReturn(Optional.of(session));

        CustomException exception = assertThrows(CustomException.class, 
                () -> sessionService.closeSession(SESSION_ID));
        assertEquals("SESSION_ALREADY_CLOSE", exception.getErrorCode());
    }
}