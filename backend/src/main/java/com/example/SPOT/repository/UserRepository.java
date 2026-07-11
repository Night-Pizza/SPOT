package com.example.SPOT.repository;

import com.example.SPOT.model.UserModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<UserModel, Long> {

    boolean existsByEmail(String email);

    UserModel findByEmail(String email);

    Optional<UserModel> findByWebauthCredentialId(byte[] webauthnCredentialId);

    Optional<UserModel> findByWebauthDeviceFingerprint(String fingerprint);
}