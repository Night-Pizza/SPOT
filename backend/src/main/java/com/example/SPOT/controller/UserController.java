package com.example.SPOT.controller;

import com.example.SPOT.dto.request.UserCreateDTO;
import com.example.SPOT.dto.request.UserLoginDTO;
import com.example.SPOT.dto.request.UserUpdateDTO;
import com.example.SPOT.dto.response.UserDTO;
import com.example.SPOT.service.UserService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import java.util.Collections;
import org.springframework.security.core.Authentication;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/user")
public class UserController {
    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserDTO> getUser(@PathVariable Long id) {
        return ResponseEntity.ok(userService.getUser(id));
    }

    @PostMapping("/login")
    public ResponseEntity<UserDTO> signIn(@RequestBody UserLoginDTO loginDTO, HttpServletRequest request) {
        UserDTO response = userService.loginUser(loginDTO);

        //old session invalidation
        HttpSession existingSession = request.getSession(false);
        if (existingSession != null) {
            existingSession.invalidate();
        }
        
        //new session creation
        HttpSession session = request.getSession(true);

        /** set aunthentication params to spring security context
         * principal - user id
         * credentials - null (we don't need it after successful login)
         * authorities - empty list (we don't have roles in our application)
         **/
        Authentication authentication = UsernamePasswordAuthenticationToken.authenticated(
                response.id().toString(),
                null,
                Collections.emptyList());

        SecurityContext securityContext = SecurityContextHolder.createEmptyContext();
        securityContext.setAuthentication(authentication);
        SecurityContextHolder.setContext(securityContext);

        //set security context to session for spring security
        session.setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, securityContext);
        
        return ResponseEntity.ok()
                .body(userService.loginUser(loginDTO));
    }

    @PostMapping("/register")
    public ResponseEntity<UserDTO> createUser(@RequestBody UserCreateDTO userCreateDTO, HttpServletRequest request) {
        return ResponseEntity.status(201)
                .body(userService.createUser(userCreateDTO));
    }

    @DeleteMapping("/{id}")
    public void deleteUser(@PathVariable Long id){
        userService.deleteUser(id);
    }

    @PatchMapping("/{id}")
    public ResponseEntity<UserDTO> updateUser(@PathVariable Long id, @RequestBody UserUpdateDTO userUpdateDTO) {
        return ResponseEntity.ok(userService.updateUser(id, userUpdateDTO));
    }

}