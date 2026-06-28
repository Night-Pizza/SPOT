package com.example.SPOT.controller;

import com.example.SPOT.dto.request.UserCreateDTO;
import com.example.SPOT.dto.request.UserLoginDTO;
import com.example.SPOT.dto.response.UserDTO;
import com.example.SPOT.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.util.Collections;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.example.SPOT.dto.request.UserUpdateDTO;


@RestController
@RequestMapping("/user")
public class UserController {
    private final UserService userService;
    private final SecurityContextRepository securityContextRepository;

    public UserController(UserService userService, SecurityContextRepository securityContextRepository) {
        this.userService = userService;
        this.securityContextRepository = securityContextRepository;
    }

    @GetMapping()
    public ResponseEntity<UserDTO> getUser(@AuthenticationPrincipal String userIdStr) {
        Long userId = Long.valueOf(userIdStr);
        return ResponseEntity.ok(userService.getUser(userId));
    }

    @GetMapping("/me")
    public ResponseEntity<UserDTO> getCurrentUser(@AuthenticationPrincipal String userIdStr) {
        Long userId = Long.valueOf(userIdStr);
        
        return ResponseEntity.ok(userService.getUser(userId));
    }

    @PostMapping("/login")
    public ResponseEntity<UserDTO> signIn(@RequestBody UserLoginDTO loginDTO, HttpServletRequest request, HttpServletResponse responseHttp) {
        UserDTO response = userService.loginUser(loginDTO);

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
        
        return ResponseEntity.ok().body(response);
    }


    @PostMapping("/register")
    public ResponseEntity<UserDTO> createUser(@RequestBody UserCreateDTO userCreateDTO, HttpServletRequest request, HttpServletResponse responseHttp) {
        UserDTO response = userService.createUser(userCreateDTO);

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

        return ResponseEntity.ok().body(response);
    }

    @DeleteMapping("/delete")
    public void deleteUser(@AuthenticationPrincipal String userIdStr){
        Long userId = Long.valueOf(userIdStr);
        userService.deleteUser(userId);
    }

    @PatchMapping("/update")
    public ResponseEntity<UserDTO> updateUser(@AuthenticationPrincipal String userIdStr, @RequestBody UserUpdateDTO userUpdateDTO) {
        Long userId = Long.valueOf(userIdStr);
        return ResponseEntity.ok(userService.updatePassword(userId, userUpdateDTO));
    }

}