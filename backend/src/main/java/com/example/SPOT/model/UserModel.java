package com.example.SPOT.model;

import com.example.SPOT.converter.DoubleArrayConverter;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "users")
@AllArgsConstructor
@NoArgsConstructor
public class UserModel {
    @Id
    @Column(name = "id")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "email")
    private String email;

    @Column(name = "password")
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(name = "auth_provider")
    private AuthProvider authProvider = AuthProvider.LOCAL;

    @Column(name = "embedding", columnDefinition = "TEXT")
    @Convert(converter = DoubleArrayConverter.class)
    private Double[] embedding;

    @Column(columnDefinition = "BYTEA")
    private byte[] webauthCredentialId;

    @Column(columnDefinition = "BYTEA")
    private byte[] webauthPublicKey;

    private Long webauthSignatureCount;

    private LocalDateTime webauthLastModified;
    @PrePersist
    public void prePersist() {
        if (authProvider == null) {
            authProvider = AuthProvider.LOCAL;
        }
    }

}
