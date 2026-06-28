package com.example.SPOT.service;

import com.example.SPOT.dto.request.AddFaceDTO;
import com.example.SPOT.dto.request.UserCreateDTO;
import com.example.SPOT.dto.request.UserLoginDTO;
import com.example.SPOT.dto.request.UserUpdateDTO;
import com.example.SPOT.dto.response.FaceResponseDTO;
import com.example.SPOT.dto.response.UserDTO;
import com.example.SPOT.exception.CustomException;
import com.example.SPOT.kafka.KafkaMessagingService;
import com.example.SPOT.model.EmbeddingStatus;
import com.example.SPOT.model.KafkaModel;
import com.example.SPOT.model.UserModel;
import com.example.SPOT.repository.KafkaRepository;
import com.example.SPOT.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;
import org.springframework.security.crypto.password.PasswordEncoder;

@Service
public class UserService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final KafkaMessagingService kafka;
    private final KafkaRepository kafkaRepository;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder,
                       KafkaMessagingService kafka, KafkaRepository kafkaRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.kafka = kafka;
        this.kafkaRepository = kafkaRepository;
    }

    public UserDTO getUser(Long id) {
        UserModel user = userRepository.findById(id)
                .orElseThrow(() -> new CustomException("ID_NOT_EXIST", "User id does not exist"));
        return mapToDTO(user);
    }

    public UserDTO loginUser(UserLoginDTO userLoginDTO) {
        if (userLoginDTO.email() == null || userLoginDTO.password() == null) {
            throw new CustomException("INVALID_CREDENTIALS", "Email and password must not be null");
        }

        validateEmail(userLoginDTO.email());

        UserModel user = userRepository.findByEmail(userLoginDTO.email());

        if (user == null) {
            throw new CustomException("EMAIL_DOES_NOT_EXIST", "User with this email does not exist");
        }

        if (!passwordEncoder.matches(userLoginDTO.password(), user.getPassword())) {
            throw new CustomException("WRONG_PASSWORD", "Password does not match");
        }

        return mapToDTO(user);
    }

    public UserDTO createUser(UserCreateDTO userCreateDTO) {
        validateEmail(userCreateDTO.email());

        if (userRepository.existsByEmail(userCreateDTO.email()))
            throw new CustomException("EMAIL_ALREADY_EXISTS", "User with this email is already exists");

        validatePassword(userCreateDTO.password());

        UserModel newUser = new UserModel(
                null,
                userCreateDTO.email(),
                passwordEncoder.encode(userCreateDTO.password()),
                null
        );
        return mapToDTO(userRepository.save(newUser));
    }

    public void deleteUser(Long id) {
        if (!userRepository.existsById(id))
            throw new CustomException("ID_NOT_EXIST", "User id does not exist");
        userRepository.deleteById(id);
    }

    @Transactional
    public UserDTO updatePassword(Long id, UserUpdateDTO userUpdateDTO) {
        UserModel userEntity = userRepository.findById(id)
                .orElseThrow(() -> new CustomException("ID_NOT_EXIST", "User id does not exist"));

        if (userUpdateDTO.currentPassword() == null || userUpdateDTO.newPassword() == null) {
            throw new CustomException("INVALID_CREDENTIALS", "Current and new passwords must not be null");
        }

        if (!passwordEncoder.matches(userUpdateDTO.currentPassword(), userEntity.getPassword())) {
            throw new CustomException("WRONG_PASSWORD", "Current password does not match");
        }

        if (userUpdateDTO.currentPassword().equals(userUpdateDTO.newPassword())) {
            throw new CustomException("INVALID_PASSWORD", "New password matches current one");
        }

        validatePassword(userUpdateDTO.newPassword());

        userEntity.setPassword(passwordEncoder.encode(userUpdateDTO.newPassword()));

        return mapToDTO(userRepository.save(userEntity));
    }

    public FaceResponseDTO addFace(Long id, AddFaceDTO addFaceDTO) {
        UserModel userEntity = userRepository.findById(id)
                .orElseThrow(() -> new CustomException("ID_NOT_EXIST", "User id does not exist"));

        KafkaModel kafkaRequest = new KafkaModel(
                null,
                id,
                null,
                EmbeddingStatus.PENDING_FOR_DB,
                0,
                null,
                null
        );
        kafkaRepository.save(kafkaRequest);
        kafka.dispatchFace(kafkaRequest.getId(), id, addFaceDTO.image());

        return mapToDTO(kafkaRequest.getId(), EmbeddingStatus.PENDING_FOR_DB);
    }

    private FaceResponseDTO mapToDTO(Long id, EmbeddingStatus embeddingStatus) {
        return new FaceResponseDTO(
                id,
                embeddingStatus
        );
    }

    private UserDTO mapToDTO(UserModel userModel) {
        return new UserDTO(
                userModel.getId(),
                userModel.getEmail()
        );
    }

    private void validateEmail(String email) {
        if (email == null || email.isEmpty()) {
            throw new CustomException("INVALID_EMAIL", "Email cannot be empty");
        }

        if (email.contains(" ") || !email.equals(email.toLowerCase())) {
            throw new CustomException("INVALID_EMAIL_FORMAT", "Email must be in lowercase and contain no spaces");
        }

        if (!(email.endsWith("@innopolis.ru") || email.endsWith("@innopolis.university"))) {
            throw new CustomException("INVALID_EMAIL_DOMAIN", "Email must belong to @innopolis.ru or @innopolis.university");
        }
    }

    private void validatePassword(String password) {
        if (password == null || password.trim().length() < 8) {
            throw new CustomException("WEAK_PASSWORD", "Password must be at least 8 characters long");
        }

        if (!password.matches("^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=!*~_\\-?]).{8,}$")) {
            throw new CustomException("WEAK_PASSWORD", "Password must contain at least one digit, one lowercase, one uppercase letter and one special character");
        }
    }
}