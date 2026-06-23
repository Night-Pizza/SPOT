package com.example.SPOT.model;

import jakarta.persistence.*;
import java.util.List;
import java.util.ArrayList;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "sessions")
@AllArgsConstructor
@NoArgsConstructor
public class SessionModel {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;

    @ManyToOne
    @JoinColumn(name = "owner_id")
    private UserModel owner;
    private boolean isActive;
    private LocalDateTime createAt;

    private Double latitude;
    private Double longitude;
    private Double allowedRadius;
    private String password;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "session_validations", joinColumns = @JoinColumn(name = "session_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "validation_type")
    private List<ValidationType> validationTypes = new ArrayList<>();
}
