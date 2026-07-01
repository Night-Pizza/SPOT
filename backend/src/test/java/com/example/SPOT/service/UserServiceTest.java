package com.example.SPOT.service;

import com.example.SPOT.dto.request.UserCreateDTO;
import com.example.SPOT.dto.request.UserLoginDTO;
import com.example.SPOT.dto.request.UserUpdateDTO;
import com.example.SPOT.dto.response.UserDTO;
import com.example.SPOT.exception.CustomException;
import com.example.SPOT.kafka.KafkaMessagingService;
import com.example.SPOT.model.UserModel;
import com.example.SPOT.repository.KafkaRepository;
import com.example.SPOT.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private KafkaMessagingService kafka;

    @Mock
    private KafkaRepository kafkaRepository;

    @InjectMocks
    private UserService userService;

    private UserModel testUser;

    @BeforeEach
    void setUp() {
        testUser = new UserModel(1L, "test@innopolis.university", "encodedPassword", null);
    }

    @Test
    void getUser_ShouldReturnUserDTO_WhenUserExists() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));

        UserDTO result = userService.getUser(1L);

        assertNotNull(result);
        assertEquals(testUser.getEmail(), result.email());
        verify(userRepository).findById(1L);
    }

    @Test
    void getUser_ShouldThrowException_WhenUserDoesNotExist() {
        when(userRepository.findById(1L)).thenReturn(Optional.empty());

        CustomException exception = assertThrows(CustomException.class, () -> userService.getUser(1L));
        assertEquals("ID_NOT_EXIST", exception.getErrorCode());
    }

    @Test
    void createUser_ShouldSaveUser_WhenValidData() {
        UserCreateDTO dto = new UserCreateDTO("new@innopolis.ru", "Password123!");
        when(userRepository.existsByEmail(dto.email())).thenReturn(false);
        when(passwordEncoder.encode(dto.password())).thenReturn("encoded");
        when(userRepository.save(any(UserModel.class))).thenReturn(testUser);

        UserDTO result = userService.createUser(dto);

        assertNotNull(result);
        verify(userRepository).save(any(UserModel.class));
    }

    @Test
    void createUser_ShouldThrowException_WhenEmailInvalid() {
        UserCreateDTO dto = new UserCreateDTO("bad-email", "Password123!");

        CustomException exception = assertThrows(CustomException.class, () -> userService.createUser(dto));
        assertEquals("INVALID_EMAIL_DOMAIN", exception.getErrorCode());
    }

    @Test
    void createUser_ShouldThrowException_WhenPasswordWeak() {
        UserCreateDTO dto = new UserCreateDTO("valid@innopolis.ru", "123");

        CustomException exception = assertThrows(CustomException.class, () -> userService.createUser(dto));
        assertEquals("WEAK_PASSWORD", exception.getErrorCode());
    }

    @Test
    void loginUser_ShouldReturnDTO_WhenCredentialsAreCorrect() {
        UserLoginDTO loginDTO = new UserLoginDTO("test@innopolis.university", "password123");
        when(userRepository.findByEmail(loginDTO.email())).thenReturn(testUser);
        when(passwordEncoder.matches(loginDTO.password(), testUser.getPassword())).thenReturn(true);

        UserDTO result = userService.loginUser(loginDTO);

        assertNotNull(result);
        assertEquals(testUser.getEmail(), result.email());
    }

    @Test
    void loginUser_ShouldThrowException_WhenPasswordIncorrect() {
        UserLoginDTO loginDTO = new UserLoginDTO("test@innopolis.university", "wrong");
        when(userRepository.findByEmail(loginDTO.email())).thenReturn(testUser);
        when(passwordEncoder.matches("wrong", testUser.getPassword())).thenReturn(false);

        CustomException exception = assertThrows(CustomException.class, () -> userService.loginUser(loginDTO));
        assertEquals("WRONG_PASSWORD", exception.getErrorCode());
    }

    @Test
    void updatePassword_ShouldChangePassword_WhenDataIsValid() {
        UserUpdateDTO updateDTO = new UserUpdateDTO("oldPass", "NewPass123!");
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("oldPass", testUser.getPassword())).thenReturn(true);
        when(passwordEncoder.encode("NewPass123!")).thenReturn("newEncoded");
        when(userRepository.save(any(UserModel.class))).thenReturn(testUser);

        UserDTO result = userService.updatePassword(1L, updateDTO);

        assertNotNull(result);
        verify(passwordEncoder).encode("NewPass123!");
        verify(userRepository).save(testUser);
    }
}
