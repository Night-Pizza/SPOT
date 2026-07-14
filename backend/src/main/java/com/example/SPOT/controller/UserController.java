package com.example.SPOT.controller;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.SPOT.config.AuthConstants;
import com.example.SPOT.dto.request.AddFaceDTO;
import com.example.SPOT.dto.request.UserCreateDTO;
import com.example.SPOT.dto.request.UserLoginDTO;
import com.example.SPOT.dto.request.UserUpdateDTO;
import com.example.SPOT.dto.response.FaceResponseDTO;
import com.example.SPOT.dto.response.PollingStatusDTO;
import com.example.SPOT.dto.response.UserDTO;
import com.example.SPOT.exception.CustomException;
import com.example.SPOT.model.KafkaModel;
import com.example.SPOT.repository.KafkaRepository;
import com.example.SPOT.service.RateLimitService;
import com.example.SPOT.service.UserService;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;

import java.util.Collections;
import java.util.Map;
import java.time.Duration;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.Cookie;


@RestController
@RequestMapping("/user")
public class UserController {
    private final UserService userService;
    private final SecurityContextRepository securityContextRepository;
    private final KafkaRepository kafkaRepository;
    private final RateLimitService rateLimitService;

    public UserController(UserService userService, KafkaRepository kafkaRepository, SecurityContextRepository securityContextRepository, RateLimitService rateLimitService) {
        this.userService = userService;
        this.kafkaRepository = kafkaRepository;
        this.securityContextRepository = securityContextRepository;
        this.rateLimitService = rateLimitService;
    }

    private String getClientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");

        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }

        return request.getRemoteAddr();
    }

    @GetMapping("/me")
    public ResponseEntity<UserDTO> getCurrentUser(@AuthenticationPrincipal String userIdStr, HttpServletRequest request) {
        Long userId = Long.valueOf(userIdStr);
        UserDTO userDTO = userService.getUser(userId);
        
        HttpSession session = request.getSession(false);
        boolean webauthVerified = false;
        if (session != null && session.getAttribute("webauth_verified") != null) {
            webauthVerified = (Boolean) session.getAttribute("webauth_verified");
        }
        
        return ResponseEntity.ok(new UserDTO(
                userDTO.id(),
                userDTO.email(),
                userDTO.faceRegistered(),
                userDTO.webauthRegistered(),
                webauthVerified
        ));
    }

    @PostMapping("/login")
    public ResponseEntity<UserDTO> signIn(@Valid @RequestBody UserLoginDTO loginDTO, HttpServletRequest request, HttpServletResponse responseHttp) {

        String ip = getClientIp(request);
        String email = loginDTO.email() != null ? loginDTO.email().toLowerCase() : "unknown";

        String key = "login:" + ip + ":" + email;

        if (!rateLimitService.tryConsume(key, 5, Duration.ofMinutes(1))) {
            throw new CustomException("RATE_LIMIT_EXCEEDED", "Too many login attempts");
        }

        UserDTO response = userService.loginUser(loginDTO);

        HttpSession existingSession = request.getSession(false);
        if (existingSession != null) {
            existingSession.invalidate();
        }
        
        HttpSession session = request.getSession(true);
        session.setAttribute(AuthConstants.AUTH_METHOD_SESSION_ATTRIBUTE, AuthConstants.AUTH_METHOD_LOCAL);
        session.setAttribute(AuthConstants.AUTHENTICATED_AT_SESSION_ATTRIBUTE, Instant.now());

        Authentication authentication = UsernamePasswordAuthenticationToken.authenticated(
                response.id().toString(),
                null,
                List.of(new SimpleGrantedAuthority(AuthConstants.ROLE_LOCAL)));

        SecurityContext securityContext = SecurityContextHolder.createEmptyContext();
        securityContext.setAuthentication(authentication);
        SecurityContextHolder.setContext(securityContext);

        securityContextRepository.saveContext(securityContext, request, responseHttp);
        
        return ResponseEntity.ok().body(response);
    }


    @PostMapping("/register")
    public ResponseEntity<UserDTO> createUser(@Valid @RequestBody UserCreateDTO userCreateDTO, HttpServletRequest request, HttpServletResponse responseHttp) {
        UserDTO response = userService.createUser(userCreateDTO);

        HttpSession existingSession = request.getSession(false);
        if (existingSession != null) {
            existingSession.invalidate();
        }

        HttpSession session = request.getSession(true);
        session.setAttribute(AuthConstants.AUTH_METHOD_SESSION_ATTRIBUTE, AuthConstants.AUTH_METHOD_LOCAL);
        session.setAttribute(AuthConstants.AUTHENTICATED_AT_SESSION_ATTRIBUTE, Instant.now());

        Authentication authentication = UsernamePasswordAuthenticationToken.authenticated(
                response.id().toString(),
                null,
                List.of(new SimpleGrantedAuthority(AuthConstants.ROLE_LOCAL)));

        SecurityContext securityContext = SecurityContextHolder.createEmptyContext();
        securityContext.setAuthentication(authentication);
        SecurityContextHolder.setContext(securityContext);

        securityContextRepository.saveContext(securityContext, request, responseHttp);

        return ResponseEntity.ok().body(response);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request, HttpServletResponse responseHttp) {
        HttpSession existingSession = request.getSession(false);
        if (existingSession != null) {
            existingSession.invalidate();
        }

        SecurityContextHolder.clearContext();

        Cookie sessionCookie = new Cookie("JSESSIONID", null);
        sessionCookie.setMaxAge(0);
        sessionCookie.setPath("/");
        responseHttp.addCookie(sessionCookie); 

        Cookie csrfCookie = new Cookie("XSRF-TOKEN", null);
        csrfCookie.setMaxAge(0);
        csrfCookie.setPath("/");
        responseHttp.addCookie(csrfCookie); 

        return ResponseEntity.ok().build();
    }

    @PatchMapping("/update")
    public ResponseEntity<UserDTO> updateUser(@AuthenticationPrincipal String userIdStr, @Valid @RequestBody UserUpdateDTO userUpdateDTO) {
        Long userId = Long.valueOf(userIdStr);
        return ResponseEntity.ok(userService.updatePassword(userId, userUpdateDTO));
    }

    @PostMapping("/face")
    public ResponseEntity<FaceResponseDTO> addFace(@AuthenticationPrincipal String userIdStr, @Valid @RequestBody AddFaceDTO addFaceDTO) {
        Long userId = Long.valueOf(userIdStr);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(userService.addFace(userId, addFaceDTO));
    }

    @GetMapping("/face/status/{requestId}")
    public ResponseEntity<PollingStatusDTO> checkFaceStatus(@PathVariable Long requestId, @AuthenticationPrincipal String userIdStr) {
        KafkaModel request = (KafkaModel) kafkaRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found"));

        if (!request.getUserId().equals(Long.valueOf(userIdStr))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(new PollingStatusDTO(
                request.getStatus().name(),
                request.getErrorMessage() != null ? request.getErrorMessage() : ""
        ));
    }

    @GetMapping("/search")
    public ResponseEntity<List<UserDTO>> searchUsers(@RequestParam("q") String query) {
        return ResponseEntity.ok(userService.searchUsers(query));
    }
}
