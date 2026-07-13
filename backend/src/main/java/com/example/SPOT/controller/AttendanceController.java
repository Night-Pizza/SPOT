package com.example.SPOT.controller;

import com.example.SPOT.dto.request.QrScanRequestDTO;
import com.example.SPOT.config.AuthConstants;
import com.example.SPOT.dto.request.AttendanceCreateDTO;
import com.example.SPOT.dto.request.DeleteAttendanceRequestDTO;
import com.example.SPOT.dto.request.EmailAttendanceRequestDTO;
import com.example.SPOT.dto.response.AttendDTO;
import com.example.SPOT.dto.response.AttendanceResponseDTO;
import com.example.SPOT.dto.response.PollingStatusDTO;
import com.example.SPOT.dto.response.UserAttendanceDTO;
import com.example.SPOT.exception.CustomException;
import com.example.SPOT.model.KafkaModel;
import com.example.SPOT.repository.KafkaRepository;
import com.example.SPOT.service.AttendanceService;
import com.example.SPOT.service.QRTokenService;
import com.example.SPOT.service.RateLimitService;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/attendance")
@CrossOrigin(origins = "http://localhost:5173")
public class AttendanceController {
    private static final long STUDENT_ATTENDANCE_ATTEMPT_LIMIT = 1;
    private static final Duration STUDENT_ATTENDANCE_ATTEMPT_WINDOW = Duration.ofSeconds(10);

    private final AttendanceService attendanceService;
    private final KafkaRepository kafkaRepository;
    private final QRTokenService qrTokenService;
    private final RateLimitService rateLimitService;

    public AttendanceController(AttendanceService attendanceService, KafkaRepository kafkaRepository,  QRTokenService qrTokenService, RateLimitService rateLimitService) {
        this.attendanceService = attendanceService;
        this.kafkaRepository = kafkaRepository;
        this.qrTokenService = qrTokenService;
        this.rateLimitService = rateLimitService;
    }

    @PostMapping("/create")
    public ResponseEntity<AttendDTO> createAttendance(
            @Valid @RequestBody AttendanceCreateDTO attendanceCreateDTO,
            @AuthenticationPrincipal String userIdStr,
            Authentication authentication) {
        requireSsoAuthentication(authentication);
        Long userId = Long.valueOf(userIdStr);
        enforceStudentAttendanceRateLimit(userId);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(attendanceService.createAttendance(userId, attendanceCreateDTO));
    }

    @PostMapping("/scan")
    public ResponseEntity<AttendDTO> scanQrCode(
            @Valid @RequestBody QrScanRequestDTO qrScanRequestDTO,
            @AuthenticationPrincipal String userIdStr,
            Authentication authentication){
        requireSsoAuthentication(authentication);
        Long userId = Long.valueOf(userIdStr);
        enforceStudentAttendanceRateLimit(userId);
        Long sessionId = qrTokenService.validateTokenAndGetSesionId(qrScanRequestDTO.token());

        AttendanceCreateDTO createDTO = new AttendanceCreateDTO(
                sessionId,
                qrScanRequestDTO.payload()
        );
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(attendanceService.createAttendance(userId, createDTO));
    }

    @PostMapping("/create/email")
    public ResponseEntity<AttendanceResponseDTO> createAttendance(@Valid @RequestBody EmailAttendanceRequestDTO emailAttendanceCreateDTO, @AuthenticationPrincipal String userIdStr) {
        Long userId = Long.valueOf(userIdStr);

        String key = "attendance-email:" + userId + ":" + emailAttendanceCreateDTO.sessionId();
        if (!rateLimitService.tryConsume(key, 5, Duration.ofMinutes(1))) {
            throw new CustomException("RATE_LIMIT_EXCEEDED", "Too many email attendance requests");
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(attendanceService.createAttendanceByEmail(emailAttendanceCreateDTO, userId));
    }

    @DeleteMapping("/delete")
    public ResponseEntity<Void> deleteAttendance(@Valid @RequestBody DeleteAttendanceRequestDTO deleteAttendanceCreateDTO, @AuthenticationPrincipal String userIdStr) {
        Long userId = Long.valueOf(userIdStr);
        attendanceService.deleteAttendance(deleteAttendanceCreateDTO, userId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMyAttendance(@PathVariable Long id) {
        attendanceService.deleteMyAttendance(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping()
    public ResponseEntity<List<UserAttendanceDTO>> getAllUserAttendance(@AuthenticationPrincipal String userIdStr){
        Long userId = Long.valueOf(userIdStr);
        return ResponseEntity.ok().body(attendanceService.getAllUserAttendance(userId));
    }

    @GetMapping("/all")
    public ResponseEntity<List<AttendanceResponseDTO>> getAllAttendance(){
        return ResponseEntity.ok().body(attendanceService.getAllAttendance());
    }

    @GetMapping("/status/{requestId}")
    public ResponseEntity<PollingStatusDTO> checkStatus(@PathVariable Long requestId, @AuthenticationPrincipal String userIdStr) {
        KafkaModel request = kafkaRepository.findById(requestId)
                .orElseThrow(() -> new CustomException("NOT_FOUND", "Request not found"));

        if (!request.getUserId().equals(Long.valueOf(userIdStr))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(new PollingStatusDTO(
                request.getStatus().name(),
                request.getErrorMessage() != null ? request.getErrorMessage() : ""
        ));
    }

    private void enforceStudentAttendanceRateLimit(Long userId) {
        String key = "attendance-student:" + userId;

        if (!rateLimitService.tryConsume(key, STUDENT_ATTENDANCE_ATTEMPT_LIMIT, STUDENT_ATTENDANCE_ATTEMPT_WINDOW)) {
            throw new CustomException("RATE_LIMIT_EXCEEDED", "Too many attendance attempts");
        }
    }

    private void requireSsoAuthentication(Authentication authentication) {
        if (authentication == null || authentication.getAuthorities().stream()
                .noneMatch(authority -> AuthConstants.ROLE_SSO.equals(authority.getAuthority()))) {
            throw new AccessDeniedException("SSO login is required to create attendance");
        }
    }
}
