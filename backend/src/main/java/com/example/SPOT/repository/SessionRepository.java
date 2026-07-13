package com.example.SPOT.repository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import com.example.SPOT.model.SessionModel;

import java.util.List;

@Repository
public interface SessionRepository extends JpaRepository<SessionModel, Long> {
    List<SessionModel> findAllByOwnerId(Long id);

    @Query("SELECT s.id FROM SessionModel s WHERE s.isActive = true")
    List<Long> findAllActiveIds();

    long countByOwnerId(Long id);
}