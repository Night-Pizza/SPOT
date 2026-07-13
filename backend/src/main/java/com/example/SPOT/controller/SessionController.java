package com.example.SPOT.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.SPOT.dto.request.SessionCreateDTO;
import com.example.SPOT.dto.request.SessionUpdateDTO;
import com.example.SPOT.dto.response.SessionResponseDTO;
import com.example.SPOT.dto.response.UsersForSessionDTO;
import com.example.SPOT.repository.UserRepository;
import com.example.SPOT.service.SessionService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/session")
@CrossOrigin(origins = "http://localhost:5173")
public class SessionController {
    private final SessionService sessionService;
    private final UserRepository userRepository;

    public SessionController(SessionService sessionService, UserRepository userRepository) {
        this.sessionService = sessionService;
        this.userRepository = userRepository;
    }

    @PostMapping("/create")
    public ResponseEntity<SessionResponseDTO> createSession(@Valid @RequestBody SessionCreateDTO sessionCreateDTO, @AuthenticationPrincipal String userIdStr) {
        Long userId = Long.valueOf(userIdStr);
        return ResponseEntity.status(HttpStatus.CREATED).body(sessionService.createSession(sessionCreateDTO, userId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSession(@PathVariable Long id, @AuthenticationPrincipal String userIdStr) {
        Long userId = Long.valueOf(userIdStr);
        sessionService.deleteSession(id, userId);
        return ResponseEntity.noContent().build();

    }

    @PatchMapping("/{id}")
    public ResponseEntity<Void> updateSession(@PathVariable Long id, @AuthenticationPrincipal String userIdStr, @Valid @RequestBody SessionUpdateDTO sessionUpdateDTO) {
        Long userId = Long.valueOf(userIdStr);
        sessionService.updateSessionName(id, userId, sessionUpdateDTO);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/close/{id}")
    public ResponseEntity<Void> closeSession(@PathVariable Long id, @AuthenticationPrincipal String userIdStr) {
        Long userId = Long.valueOf(userIdStr);
        sessionService.closeSession(id, userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/all")
    public ResponseEntity<List<SessionResponseDTO>> getAllSessions(){
        return ResponseEntity.ok().body(sessionService.getAllSessions());
    }

    @GetMapping("/{id}")
    public ResponseEntity<List<UsersForSessionDTO>> getAllEmailsForThisSession(@PathVariable Long id, @AuthenticationPrincipal String userIdStr){
        return ResponseEntity.ok().body(sessionService.getAllEmailsForThisSession(id, Long.valueOf(userIdStr)));
    }

}
