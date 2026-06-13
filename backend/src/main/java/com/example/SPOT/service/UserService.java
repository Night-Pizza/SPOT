package com.example.SPOT.service;

import com.example.SPOT.dto.request.UserCreateDTO;
import com.example.SPOT.dto.request.UserLoginDTO;
import com.example.SPOT.dto.request.UserUpdateDTO;
import com.example.SPOT.dto.response.UserDTO;
import com.example.SPOT.model.UserModel;
import com.example.SPOT.repository.UserRepository;
import org.springframework.stereotype.Service;

@Service
public class UserService {
    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public UserDTO getUser(Long id) {
        UserModel user = userRepository.findById(id)
                // TODO: replace with custom exception
                .orElseThrow(() -> new RuntimeException("User id does not exist"));
        return mapToDTO(user);
    }

    public UserDTO loginUser(UserLoginDTO userLoginDTO) {
        UserModel user = userRepository.findByEmail(userLoginDTO.email());

        if (user == null) {
            // TODO: replace with custom exception
            throw new RuntimeException("User with this email does not exist");
        }

        if (!user.getPassword().equals(userLoginDTO.password())) {
            // TODO: replace with custom exception
            throw new RuntimeException("Password does not match");
        }

        return mapToDTO(user);
    }

    public UserDTO createUser(UserCreateDTO userCreateDTO) {
        if (userRepository.existsByEmail(userCreateDTO.email()))
            // TODO: replace with custom exception
            throw new RuntimeException("User with this email is already exists");
        UserModel newUser = new UserModel(
                null,
                userCreateDTO.email(),
                userCreateDTO.password()
        );
        return mapToDTO(userRepository.save(newUser));
    }

    public void deleteUser(Long id) {
        if (!userRepository.existsById(id))
            // TODO: replace with custom exception
            throw new RuntimeException("User id does not exist");
        userRepository.deleteById(id);
    }

    public UserDTO updateUser(Long id, UserUpdateDTO userUpdateDTO) {
        UserModel userEntity = userRepository.findById(id)
                // TODO: replace with custom exception
                .orElseThrow(() -> new RuntimeException("User id does not exist"));

        UserModel userToUpdate = new UserModel(
                id,
                userEntity.getEmail(),
                userUpdateDTO.password()
        );

        return mapToDTO(userRepository.save(userToUpdate));
    }

    private UserDTO mapToDTO(UserModel userModel) {
        return new UserDTO(
                userModel.getId(),
                userModel.getEmail()
        );
    }
}