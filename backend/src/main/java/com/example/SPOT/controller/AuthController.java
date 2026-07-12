package com.example.SPOT.controller;

import java.net.URI;
import java.util.Collections;

import com.example.SPOT.dto.response.UserDTO;
import com.example.SPOT.service.MyUniversitySsoService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;


@RestController
@RequestMapping("/auth")
@CrossOrigin(origins = "http://localhost:5173")
public class AuthController {
    private final MyUniversitySsoService myUniversitySsoService;
    private final SecurityContextRepository securityContextRepository;

    public AuthController(MyUniversitySsoService myUniversitySsoService, SecurityContextRepository securityContextRepository) {
        this.myUniversitySsoService = myUniversitySsoService;
        this.securityContextRepository = securityContextRepository;
    }

    @GetMapping("/csrf")
    public ResponseEntity<Void> csrf(CsrfToken csrfToken) {
        csrfToken.getToken();
        return ResponseEntity.noContent().header("XSRF-TOKEN", csrfToken.getToken())
                .build();
    }

    @GetMapping("/my-university/login")
    public ResponseEntity<Void> myUniversityLogin() {
        return ResponseEntity.status(HttpStatus.FOUND)
                .location(myUniversitySsoService.buildAuthorizationUri())
                .build();
    }

    @GetMapping("/my-university/callback")
    public ResponseEntity<Void> myUniversityCallback(
            @RequestParam String code,
            HttpServletRequest request,
            HttpServletResponse responseHttp) {
        UserDTO response = myUniversitySsoService.redeemCode(code);

        HttpSession existingSession = request.getSession(false);
        if (existingSession != null) {
            existingSession.invalidate();
        }

        request.getSession(true);

        Authentication authentication = UsernamePasswordAuthenticationToken.authenticated(
                response.id().toString(),
                null,
                Collections.emptyList());

        SecurityContext securityContext = SecurityContextHolder.createEmptyContext();
        securityContext.setAuthentication(authentication);
        SecurityContextHolder.setContext(securityContext);

        securityContextRepository.saveContext(securityContext, request, responseHttp);

        URI redirectUri = myUniversitySsoService.postLoginRedirectUri();
        return ResponseEntity.status(HttpStatus.FOUND)
                .location(redirectUri)
                .build();
    }
}
