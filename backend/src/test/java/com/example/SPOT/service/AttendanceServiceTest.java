package com.example.SPOT.service;

import com.example.SPOT.dto.request.AttendanceCreateDTO;
import com.example.SPOT.dto.response.AttendDTO;
import com.example.SPOT.exception.CustomException;
import com.example.SPOT.kafka.KafkaMessagingService;
import com.example.SPOT.model.*;
import com.example.SPOT.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AttendanceServiceTest {

    @Mock private SessionRepository sessionRepository;
    @Mock private UserRepository userRepository;
    @Mock private AttendanceRepository attendanceRepository;
    @Mock private KafkaMessagingService kafka;
    @Mock private KafkaRepository kafkaRepository;
    @Mock private QRTokenService qrTokenService;

    @InjectMocks
    private AttendanceService attendanceService;

    private final Long USER_ID = 1L;
    private final Long SESSION_ID = 100L;
    private SessionModel session;
    private UserModel user;

    @BeforeEach
    void setUp() {
        session = new SessionModel();
        session.setId(SESSION_ID);
        session.setActive(true);

        user = new UserModel();
        user.setId(USER_ID);
        user.setAuthProvider(AuthProvider.MY_UNIVERSITY_SSO);
    }

    @Test
    void createAttendance_WhenUserAlreadyAttended_ThrowsException() {
        AttendanceCreateDTO request = new AttendanceCreateDTO(SESSION_ID, null);
        when(attendanceRepository.existsByUserIdAndSessionId(USER_ID, SESSION_ID)).thenReturn(true);

        CustomException exception = assertThrows(CustomException.class, 
                () -> attendanceService.createAttendance(USER_ID, request));
        assertEquals("USER_ALREADY_ATTENDED_SESSION", exception.getErrorCode()); 
    }

    @Test
    void createAttendance_WhenSessionIsClosed_ThrowsException() {
  
        session.setActive(false);
        AttendanceCreateDTO request = new AttendanceCreateDTO(SESSION_ID, null);
        
        when(attendanceRepository.existsByUserIdAndSessionId(USER_ID, SESSION_ID)).thenReturn(false);
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        when(sessionRepository.findById(SESSION_ID)).thenReturn(Optional.of(session));

        CustomException exception = assertThrows(CustomException.class, 
                () -> attendanceService.createAttendance(USER_ID, request));
        assertEquals("SESSION_IS_CLOSED", exception.getErrorCode());
    }

    @Test
    void createAttendance_WithPasswordValidation_Success() {
        session.setValidationTypes(List.of(ValidationType.PASSWORD));
        session.setPassword("secret123");

        Map<String, Object> payload = Map.of("password", "secret123");
        AttendanceCreateDTO request = new AttendanceCreateDTO(SESSION_ID, payload);

        when(attendanceRepository.existsByUserIdAndSessionId(USER_ID, SESSION_ID)).thenReturn(false);
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        when(sessionRepository.findById(SESSION_ID)).thenReturn(Optional.of(session));
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));

        when(attendanceRepository.save(any(AttendanceModel.class))).thenAnswer(invocation -> {
            AttendanceModel model = invocation.getArgument(0);
            model.setId(999L); // Присваиваем фейковый ID
            return model;
        });

        AttendDTO result = attendanceService.createAttendance(USER_ID, request);

        assertEquals(999L, result.payload().get("attendanceId")); // Заодно можем проверить, что ID вернулся правильно
        verify(attendanceRepository, times(1)).save(any(AttendanceModel.class));
    }

    @Test
    void createAttendance_WithInvalidPassword_ThrowsException() {

        session.setValidationTypes(List.of(ValidationType.PASSWORD));
        session.setPassword("secret123");
        
        Map<String, Object> payload = Map.of("password", "wrongPassword");
        AttendanceCreateDTO request = new AttendanceCreateDTO(SESSION_ID, payload);

        when(attendanceRepository.existsByUserIdAndSessionId(USER_ID, SESSION_ID)).thenReturn(false);
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        when(sessionRepository.findById(SESSION_ID)).thenReturn(Optional.of(session));


        CustomException exception = assertThrows(CustomException.class, 
                () -> attendanceService.createAttendance(USER_ID, request));
        assertEquals("INVALID_PASSWORD", exception.getErrorCode());
        verify(attendanceRepository, never()).save(any()); // Проверяем, что в БД ничего не ушло
    }

    @Test
    void createAttendance_WithGpsValidation_Success() {
        session.setValidationTypes(List.of(ValidationType.GPS));
        session.setLatitude(55.7558);
        session.setLongitude(37.6173);
        session.setAllowedRadius(100.0);

        Map<String, Object> payload = Map.of("latitude", 55.7559, "longitude", 37.6174);
        AttendanceCreateDTO request = new AttendanceCreateDTO(SESSION_ID, payload);

        when(attendanceRepository.existsByUserIdAndSessionId(USER_ID, SESSION_ID)).thenReturn(false);
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        when(sessionRepository.findById(SESSION_ID)).thenReturn(Optional.of(session));
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));

        when(attendanceRepository.save(any(AttendanceModel.class))).thenAnswer(invocation -> {
            AttendanceModel model = invocation.getArgument(0);
            model.setId(888L);
            return model;
        });

        AttendDTO result = attendanceService.createAttendance(USER_ID, request);

        assertEquals(888L, result.payload().get("attendanceId"));
    }

    @Test
    void createAttendance_WithGpsValidation_ThrowsWhenOutOfRadius() {
        session.setValidationTypes(List.of(ValidationType.GPS));
        session.setLatitude(55.7558);
        session.setLongitude(37.6173);
        session.setAllowedRadius(100.0); 
        
        Map<String, Object> payload = Map.of("latitude", 56.0, "longitude", 38.0);
        AttendanceCreateDTO request = new AttendanceCreateDTO(SESSION_ID, payload);

        when(attendanceRepository.existsByUserIdAndSessionId(USER_ID, SESSION_ID)).thenReturn(false);
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        when(sessionRepository.findById(SESSION_ID)).thenReturn(Optional.of(session));

        CustomException exception = assertThrows(CustomException.class, 
                () -> attendanceService.createAttendance(USER_ID, request));
        assertEquals("OUT_OF_ATTENDANCE_RADIUS", exception.getErrorCode());
    }

    @Test
    void createAttendance_WithFaceValidation_ReturnsPendingAndCallsKafka() {
        session.setValidationTypes(List.of(ValidationType.FACE));

        List<String> mockImages = List.of("img1_base64", "img2_base64", "img3_base64");
        Map<String, Object> payload = Map.of("images", mockImages);
        AttendanceCreateDTO request = new AttendanceCreateDTO(SESSION_ID, payload);

        when(attendanceRepository.existsByUserIdAndSessionId(USER_ID, SESSION_ID)).thenReturn(false);
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        when(sessionRepository.findById(SESSION_ID)).thenReturn(Optional.of(session));

        when(kafkaRepository.save(any(KafkaModel.class))).thenAnswer(invocation -> {
            KafkaModel model = invocation.getArgument(0);
            model.setId(500L);
            return model;
        });

        AttendDTO result = attendanceService.createAttendance(USER_ID, request);

        assertEquals(500L, result.payload().get("requestId")); // Убеждаемся, что ID прокинулся в ответ

        verify(kafkaRepository, times(1)).save(any(KafkaModel.class));
        verify(kafka, times(3)).dispatchFace(anyLong(), eq(USER_ID), anyString());
        verify(attendanceRepository, never()).save(any(AttendanceModel.class));
    }
}
