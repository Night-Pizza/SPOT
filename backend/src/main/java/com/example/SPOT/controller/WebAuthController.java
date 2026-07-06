package com.example.SPOT.controller;

import com.example.SPOT.dto.request.WebAuthRegistrationVerifyDTO;
import com.example.SPOT.dto.request.WebAuthAssertionVerifyDTO;
import com.example.SPOT.dto.response.WebAuthRegistrationOptionsDTO;
import com.example.SPOT.dto.response.WebAuthAssertionOptionsDTO;
import com.example.SPOT.service.WebAuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/webauth")
public class WebAuthController {

    private final WebAuthService webAuthService;

    public WebAuthController(WebAuthService webAuthService) {
        this.webAuthService = webAuthService;
    }

    @GetMapping("/register/options")
    public ResponseEntity<WebAuthRegistrationOptionsDTO> getRegisterOptions(@AuthenticationPrincipal String userIdStr) {
        Long userId = Long.valueOf(userIdStr);
        WebAuthRegistrationOptionsDTO options = webAuthService.generateRegisterOptions(userId);
        return ResponseEntity.ok(options);
    }

    @PostMapping("/register/verify")
    public ResponseEntity<Void> verifyRegister(
            @AuthenticationPrincipal String userIdStr,
            @Valid @RequestBody WebAuthRegistrationVerifyDTO requestDto) {
        Long userId = Long.valueOf(userIdStr);
        webAuthService.verifyRegisterResponse(userId, requestDto);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/attendance/options")
    public ResponseEntity<WebAuthAssertionOptionsDTO> getAttendanceOptions(@AuthenticationPrincipal String userIdStr) {
        Long userId = Long.valueOf(userIdStr);
        WebAuthAssertionOptionsDTO options = webAuthService.generateAttendanceOptions(userId);
        return ResponseEntity.ok(options);
    }

    @PostMapping("/attendance/verify")
    public ResponseEntity<Void> verifyAttendance(
            @AuthenticationPrincipal String userIdStr,
            @Valid @RequestBody WebAuthAssertionVerifyDTO requestDto) {
        Long userId = Long.valueOf(userIdStr);
        webAuthService.verifyAttendanceResponse(userId, requestDto);
        return ResponseEntity.ok().build();
    }
}