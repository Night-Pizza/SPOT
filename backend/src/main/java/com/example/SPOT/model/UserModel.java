package com.example.SPOT.model;

import com.example.SPOT.converter.DoubleArrayConverter;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

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

    @Column(name = "embedding", columnDefinition = "TEXT")
    @Convert(converter = DoubleArrayConverter.class)
    private Double[] embedding;

    @Column(columnDefinition = "BYTEA")
    private byte[] webauthCredentialId;

    @Column(columnDefinition = "BYTEA")
    private byte[] webauthPublicKey;

    private Long webauthSignatureCount;
}