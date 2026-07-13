package com.example.SPOT.controller;

import java.net.URI;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.List;

import com.example.SPOT.config.AuthConstants;
import com.example.SPOT.dto.response.UserDTO;
import com.example.SPOT.exception.CustomException;
import com.example.SPOT.service.MyUniversitySsoService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
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
    static final String SSO_STATE_SESSION_ATTRIBUTE = "MY_UNIVERSITY_SSO_STATE";
    private static final int SSO_STATE_BYTES = 32;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

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
    public ResponseEntity<Void> myUniversityLogin(HttpServletRequest request) {
        String state = generateState();
        request.getSession(true).setAttribute(SSO_STATE_SESSION_ATTRIBUTE, state);

        return ResponseEntity.status(HttpStatus.FOUND)
                .location(myUniversitySsoService.buildAuthorizationUri(state))
                .build();
    }

    @GetMapping("/my-university/callback")
    public ResponseEntity<Void> myUniversityCallback(
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String state,
            HttpServletRequest request,
            HttpServletResponse responseHttp) {
        validateState(request, state);

        UserDTO response = myUniversitySsoService.redeemCode(code);

        HttpSession existingSession = request.getSession(false);
        if (existingSession != null) {
            existingSession.invalidate();
        }

        HttpSession session = request.getSession(true);
        session.setAttribute(AuthConstants.AUTH_METHOD_SESSION_ATTRIBUTE, AuthConstants.AUTH_METHOD_SSO);
        session.setAttribute(AuthConstants.AUTHENTICATED_AT_SESSION_ATTRIBUTE, Instant.now());

        Authentication authentication = UsernamePasswordAuthenticationToken.authenticated(
                response.id().toString(),
                null,
                List.of(new SimpleGrantedAuthority(AuthConstants.ROLE_SSO)));

        SecurityContext securityContext = SecurityContextHolder.createEmptyContext();
        securityContext.setAuthentication(authentication);
        SecurityContextHolder.setContext(securityContext);

        securityContextRepository.saveContext(securityContext, request, responseHttp);

        URI redirectUri = myUniversitySsoService.postLoginRedirectUri();
        return ResponseEntity.status(HttpStatus.FOUND)
                .location(redirectUri)
                .build();
    }

    private String generateState() {
        byte[] bytes = new byte[SSO_STATE_BYTES];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private void validateState(HttpServletRequest request, String receivedState) {
        HttpSession session = request.getSession(false);
        if (session == null) {
            throw new CustomException("SSO_STATE_INVALID", "SSO state is invalid");
        }

        Object expectedState = session.getAttribute(SSO_STATE_SESSION_ATTRIBUTE);
        session.removeAttribute(SSO_STATE_SESSION_ATTRIBUTE);

        if (!(expectedState instanceof String expected)
                || expected.isBlank()
                || receivedState == null
                || receivedState.isBlank()
                || !expected.equals(receivedState)) {
            throw new CustomException("SSO_STATE_INVALID", "SSO state is invalid");
        }
    }
}
