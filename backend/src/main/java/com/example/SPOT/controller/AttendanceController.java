package com.example.SPOT.controller;

import com.example.SPOT.dto.request.AttendanceCreateDTO;
import com.example.SPOT.dto.request.QrScanRequestDTO;
import com.example.SPOT.dto.response.AttendanceResponseDTO;
import com.example.SPOT.dto.response.UserAttendanceDTO;
import com.example.SPOT.exception.CustomException;
import com.example.SPOT.model.KafkaModel;
import com.example.SPOT.repository.KafkaRepository;
import com.example.SPOT.service.AttendanceService;
import com.example.SPOT.service.QRTokenService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/attendance")
@CrossOrigin(origins = "http://localhost:5173")
public class AttendanceController {
    private final AttendanceService attendanceService;
    private final KafkaRepository kafkaRepository;

    public AttendanceController(AttendanceService attendanceService, KafkaRepository kafkaRepository) {
        this.attendanceService = attendanceService;
        this.kafkaRepository = kafkaRepository;
    }

    @PostMapping("/create")
    public ResponseEntity<Map<String, Object>> createAttendance(@Valid @RequestBody AttendanceCreateDTO attendanceCreateDTO, @AuthenticationPrincipal String userIdStr) {
        Long userId = Long.valueOf(userIdStr);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(attendanceService.createAttendance(userId, attendanceCreateDTO));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAttendance(@PathVariable Long id) {
        attendanceService.deleteAttendance(id);
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
    public ResponseEntity<Map<String, Object>> checkStatus(@PathVariable Long requestId, @AuthenticationPrincipal String userIdStr) {
        KafkaModel request = (KafkaModel) kafkaRepository.findById(requestId)
                .orElseThrow(() -> new CustomException("NOT_FOUND", "Request not found"));

        if (!request.getUserId().equals(Long.valueOf(userIdStr))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(Map.of(
                "status", request.getStatus().name(),
                "errorMessage", request.getErrorMessage() != null ? request.getErrorMessage() : ""
        ));
    }
}