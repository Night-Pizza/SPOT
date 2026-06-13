package com.example.SPOT.service;

import com.example.SPOT.dto.request.UserCreateDTO;
import com.example.SPOT.dto.request.UserLoginDTO;
import com.example.SPOT.dto.request.UserUpdateDTO;
import com.example.SPOT.dto.response.UserDTO;
import com.example.SPOT.model.UserModel;
import com.example.SPOT.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;
import org.springframework.security.crypto.password.PasswordEncoder;

@Service
public class UserService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public UserDTO getUser(Long id) {
        UserModel user = userRepository.findById(id)
                // TODO: replace with custom exception
                .orElseThrow(() -> new RuntimeException("User id does not exist"));
        return mapToDTO(user);
    }

    public UserDTO loginUser(UserLoginDTO userLoginDTO) {
        if (userLoginDTO.email() == null || userLoginDTO.password() == null) {
            // TODO: replace with custom exception
            throw new RuntimeException("Email and password must not be null");
        }

        validateEmail(userLoginDTO.email());

        UserModel user = userRepository.findByEmail(userLoginDTO.email());

        if (user == null) {
            // TODO: replace with custom exception
            throw new RuntimeException("User with this email does not exist");
        }

        if (!passwordEncoder.matches(userLoginDTO.password(), user.getPassword())) {
            // TODO: replace with custom exception
            throw new RuntimeException("Password does not match");
        }

        return mapToDTO(user);
    }

    public UserDTO createUser(UserCreateDTO userCreateDTO) {
        validateEmail(userCreateDTO.email());

        if (userRepository.existsByEmail(userCreateDTO.email()))
            // TODO: replace with custom exception
            throw new RuntimeException("User with this email is already exists");

        if (userCreateDTO.password() == null || userCreateDTO.password().trim().isEmpty()) {
            // TODO: replace with custom exception
            throw new RuntimeException("Password cannot be empty");
        }

        UserModel newUser = new UserModel(
                null,
                userCreateDTO.email(),
                passwordEncoder.encode(userCreateDTO.password())
        );
        return mapToDTO(userRepository.save(newUser));
    }

    public void deleteUser(Long id) {
        if (!userRepository.existsById(id))
            // TODO: replace with custom exception
            throw new RuntimeException("User id does not exist");
        userRepository.deleteById(id);
    }

    @Transactional
    public UserDTO updatePassword(Long id, UserUpdateDTO userUpdateDTO) {
        UserModel userEntity = userRepository.findById(id)
                // TODO: replace with custom exception
                .orElseThrow(() -> new RuntimeException("User id does not exist"));

        if (userUpdateDTO.currentPassword() == null || userUpdateDTO.newPassword() == null) {
            // TODO: replace with custom exception
            throw new RuntimeException("Current and new passwords must not be null");
        }

        if (!passwordEncoder.matches(userUpdateDTO.currentPassword(), userEntity.getPassword())) {
            // TODO: replace with custom exception
            throw new RuntimeException("Current password does not match");
        }

        if (userUpdateDTO.currentPassword().equals(userUpdateDTO.newPassword())) {
            // TODO: replace with custom exception
            throw new RuntimeException("New password matches current one");
        }

        validatePassword(userUpdateDTO.newPassword());

        userEntity.setPassword(passwordEncoder.encode(userUpdateDTO.newPassword()));

        return mapToDTO(userRepository.save(userEntity));
    }

    private UserDTO mapToDTO(UserModel userModel) {
        return new UserDTO(
                userModel.getId(),
                userModel.getEmail()
        );
    }

    private void validateEmail(String email) {
        if (email == null || email.isEmpty()) {
            // TODO: replace with custom exception
            throw new RuntimeException("Email cannot be empty");
        }

        if (email.contains(" ") || !email.equals(email.toLowerCase())) {
            // TODO: replace with custom exception
            throw new RuntimeException("Email must be in lowercase and contain no spaces");
        }

        if (!(email.endsWith("@innopolis.ru") || email.endsWith("@innopolis.university"))) {
            // TODO: replace with custom exception
            throw new RuntimeException("Email must belong to @innopolis.ru or @innopolis.university");
        }
    }

    private void validatePassword(String password) {
        if (password == null || password.trim().length() < 8) {
            // TODO: replace with custom exception
            throw new RuntimeException("Password must be at least 8 characters long");
        }

        if (!password.matches("^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=!*~_\\-?]).{8,}$")) {
            // TODO: replace with custom exception
            throw new RuntimeException("Password must contain at least one digit, one lowercase, one uppercase letter and one special character");
        }
    }
}