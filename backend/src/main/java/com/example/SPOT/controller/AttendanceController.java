package com.example.SPOT.controller;

import java.io.IOException;
import java.time.Duration;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.SPOT.config.AuthConstants;
import com.example.SPOT.dto.request.AttendanceCreateDTO;
import com.example.SPOT.dto.request.DeleteAttendanceRequestDTO;
import com.example.SPOT.dto.request.EmailAttendanceRequestDTO;
import com.example.SPOT.dto.request.QrScanRequestDTO;
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

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

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
            Authentication authentication,
            HttpServletRequest request) {
        requireSsoAuthentication(authentication);
        Boolean isVerified = (Boolean) request.getSession().getAttribute("webauth_verified");
        if (isVerified == null || !isVerified) {
            throw new CustomException("UNAUTHORIZED", "WebAuthn verification is required to record attendance");
        }
        Long userId = Long.valueOf(userIdStr);
        enforceStudentAttendanceRateLimit(userId);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(attendanceService.createAttendance(userId, attendanceCreateDTO));
    }

    @PostMapping("/scan")
    public ResponseEntity<AttendDTO> scanQrCode(
            @Valid @RequestBody QrScanRequestDTO qrScanRequestDTO,
            @AuthenticationPrincipal String userIdStr,
            Authentication authentication,
            HttpServletRequest request){
        requireSsoAuthentication(authentication);
        Boolean isVerified = (Boolean) request.getSession().getAttribute("webauth_verified");
        if (isVerified == null || !isVerified) {
            throw new CustomException("UNAUTHORIZED", "WebAuthn verification is required to scan QR code");
        }
        Long userId = Long.valueOf(userIdStr);
        enforceStudentAttendanceRateLimit(userId);
        Long sessionId = qrTokenService.validateTokenAndGetSesionId(qrScanRequestDTO.token());

        AttendanceCreateDTO createDTO = new AttendanceCreateDTO(
                sessionId,
                qrScanRequestDTO.payload()
        );
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(attendanceService.createAttendance(userId, createDTO));
    }

    @GetMapping("/count")
    public ResponseEntity<Long> getAttendedSessionsCount(@AuthenticationPrincipal String userIdStr) {
        Long userId = Long.valueOf(userIdStr);
        return ResponseEntity.ok().body(attendanceService.getAttendedSessionsCount(userId));
    }





    @PostMapping("/create/email")
    public ResponseEntity<AttendanceResponseDTO> createAttendance(@Valid @RequestBody EmailAttendanceRequestDTO emailAttendanceCreateDTO, @AuthenticationPrincipal String userIdStr, HttpServletRequest request) {
        Long userId = Long.valueOf(userIdStr);

        String key = "attendance-email:" + userId + ":" + emailAttendanceCreateDTO.sessionId();
        if (!rateLimitService.tryConsume(key, 10, Duration.ofMinutes(1))) {
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

    @GetMapping()
    public ResponseEntity<List<UserAttendanceDTO>> getAllUserAttendance(@AuthenticationPrincipal String userIdStr) {
        Long userId = Long.valueOf(userIdStr);
        return ResponseEntity.ok().body(attendanceService.getAllUserAttendance(userId));
    }

    @GetMapping("/export")
    public void exportAttendance(
            @RequestParam Long sessionId,
            @RequestParam(defaultValue = "csv") String format,
            @AuthenticationPrincipal String userIdStr,
            HttpServletResponse response) throws IOException {
        Long userId = Long.valueOf(userIdStr);
        attendanceService.exportAttendance(sessionId, format, userId, response);
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
