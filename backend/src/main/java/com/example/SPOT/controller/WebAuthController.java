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

import com.example.SPOT.repository.UserRepository;
import com.example.SPOT.model.UserModel;

@RestController
@RequestMapping("/webauth")
public class WebAuthController {

    private final WebAuthService webAuthService;
    private final UserRepository userRepository;

    public WebAuthController(WebAuthService webAuthService, UserRepository userRepository) {
        this.webAuthService = webAuthService;
        this.userRepository = userRepository;
    }

    @GetMapping("/debug")
    public ResponseEntity<java.util.Map<String, Object>> getDebugInfo(@AuthenticationPrincipal String userIdStr) {
        Long userId = Long.valueOf(userIdStr);
        UserModel user = userRepository.findById(userId)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "User not found"));
        java.util.Map<String, Object> map = new java.util.HashMap<>();
        map.put("email", user.getEmail());
        map.put("credentialIdHex", user.getWebauthCredentialId() != null ? 
                java.util.HexFormat.of().formatHex(user.getWebauthCredentialId()) : null);
        map.put("credentialIdBase64Url", user.getWebauthCredentialId() != null ? 
                new com.yubico.webauthn.data.ByteArray(user.getWebauthCredentialId()).getBase64Url() : null);
        map.put("publicKeyLen", user.getWebauthPublicKey() != null ? user.getWebauthPublicKey().length : 0);
        return ResponseEntity.ok(map);
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