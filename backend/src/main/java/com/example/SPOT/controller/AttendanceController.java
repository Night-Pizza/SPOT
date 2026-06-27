package com.example.SPOT.controller;

import com.example.SPOT.dto.request.AttendanceCreateDTO;
import com.example.SPOT.dto.request.DeleteAttendanceRequestDTO;
import com.example.SPOT.dto.request.EmailAttendanceRequestDTO;
import com.example.SPOT.dto.request.QrScanRequestDTO;
import com.example.SPOT.dto.response.AttendanceResponseDTO;
import com.example.SPOT.dto.response.UserAttendanceDTO;
import com.example.SPOT.service.AttendanceService;
import com.example.SPOT.service.QRTokenService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/attendance")
@CrossOrigin(origins = "http://localhost:5173")
public class AttendanceController {
    private final AttendanceService attendanceService;
    private final QRTokenService qrTokenService;

    public AttendanceController(AttendanceService attendanceService, QRTokenService qrTokenService) {
        this.attendanceService = attendanceService;
        this.qrTokenService = qrTokenService;
    }

    @PostMapping("/create")
    public ResponseEntity<AttendanceResponseDTO> createAttendance(@Valid @RequestBody AttendanceCreateDTO attendanceCreateDTO, @AuthenticationPrincipal String userIdStr) {
        Long userId = Long.valueOf(userIdStr);
        return ResponseEntity.status(HttpStatus.CREATED).body(attendanceService.createAttendance(userId, attendanceCreateDTO));
    }

    @PostMapping("/create/email")
    public ResponseEntity<AttendanceResponseDTO> createAttendance(@Valid @RequestBody EmailAttendanceRequestDTO emailAttendanceCreateDTO) {
        return ResponseEntity.status(HttpStatus.CREATED).body(attendanceService.createAttendanceByEmail(emailAttendanceCreateDTO));
    }

    @DeleteMapping("/delete")
    public ResponseEntity<Void> deleteAttendance(@Valid @RequestBody DeleteAttendanceRequestDTO deleteAttendanceCreateDTO) {
        attendanceService.deleteAttendance(deleteAttendanceCreateDTO);
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

    @PostMapping("/scan")
    public ResponseEntity<AttendanceResponseDTO> scanQrCode(@Valid @RequestBody QrScanRequestDTO qrScanRequestDTO, @AuthenticationPrincipal String userIdStr){
        Long userId = Long.valueOf(userIdStr);
        Long sessionId = qrTokenService.validateTokenAndGetSesionId(qrScanRequestDTO.token());

        AttendanceCreateDTO createDTO = new AttendanceCreateDTO(
                sessionId,
                qrScanRequestDTO.payload()
        );
        return ResponseEntity.ok().body(attendanceService.createAttendance(userId, createDTO));
    }
}