package com.example.SPOT.controller;

import com.example.SPOT.dto.request.AttendanceCreateDTO;
import com.example.SPOT.dto.response.AttendanceResponseDTO;
import com.example.SPOT.dto.response.UserAttendanceDTO;
import com.example.SPOT.service.AttendanceService;
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

    public AttendanceController(AttendanceService attendanceService) {
        this.attendanceService = attendanceService;
    }

    @PostMapping("/create")
    public ResponseEntity<AttendanceResponseDTO> createAttendance(@Valid @RequestBody AttendanceCreateDTO attendanceCreateDTO, @AuthenticationPrincipal String userIdStr) {
        Long userId = Long.valueOf(userIdStr);
        return ResponseEntity.status(HttpStatus.CREATED).body(attendanceService.createAttendance(userId, attendanceCreateDTO));
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
}