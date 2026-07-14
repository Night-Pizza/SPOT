package com.example.SPOT.service;

import com.example.SPOT.dto.request.SessionCreateDTO;
import com.example.SPOT.dto.request.SessionUpdateDTO;
import com.example.SPOT.dto.response.SessionDetailsDTO;
import com.example.SPOT.dto.response.UserAttendanceDTO;
import com.example.SPOT.dto.response.UsersForSessionDTO;
import com.example.SPOT.model.AttendanceModel;
import com.example.SPOT.model.UserModel;
import com.example.SPOT.repository.AttendanceRepository;
import com.example.SPOT.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import com.example.SPOT.dto.response.SessionResponseDTO;
import com.example.SPOT.exception.CustomException;
import com.example.SPOT.model.SessionModel;
import com.example.SPOT.repository.SessionRepository;
import org.springframework.web.bind.annotation.GetMapping;
import com.example.SPOT.dto.response.SessionPublicDetailsDTO;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class SessionService {
    private final SessionRepository sessionRepository;
    private final UserRepository userRepository;
    private final AttendanceRepository attendanceRepository;
    private final QRTokenService qrTokenService;

    public SessionService(SessionRepository sessionRepository, UserRepository userRepository, AttendanceRepository attendanceRepository, QRTokenService qrTokenService) {
        this.sessionRepository = sessionRepository;
        this.userRepository = userRepository;
        this.attendanceRepository = attendanceRepository;
        this.qrTokenService = qrTokenService;
    }

    public SessionModel getSessionOwnedByUser(Long sessionId, Long userId) {
        SessionModel session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new CustomException("ID_NOT_EXIST", "Session id does not exist"));

        if (!session.getOwner().getId().equals(userId)) {
            throw new CustomException("FORBIDDEN", "You do not have access to this session");
        }

        return session;
    }


    public SessionModel initializeSessionModel(String title, Long ownerId){
        SessionModel sessionModel = new SessionModel();

        sessionModel.setTitle(title);
        sessionModel.setOwner(userRepository.findById(ownerId).orElseThrow(() ->
                new CustomException("OWNER_ID_NOT_EXIST","Session owner id does not exist")));

        sessionModel.setActive(true);
        sessionModel.setCreateAt(LocalDateTime.now());

        return sessionModel;
    }

    public SessionResponseDTO createSession(SessionCreateDTO request, Long ownerId){
        SessionModel sessionModel = initializeSessionModel(request.title(), ownerId);
        
        sessionModel.setLatitude(request.latitude());
        sessionModel.setLongitude(request.longitude());
        sessionModel.setAllowedRadius(request.allowedRadius());
        sessionModel.setPassword(request.password());
        if (request.validationTypes() != null) {
            sessionModel.setValidationTypes(request.validationTypes());
        }

        return mapToDTO(sessionRepository.save(sessionModel));
    }

    public List<UserAttendanceDTO> getOwnedSessions(Long ownerId){
        return sessionRepository.findAllByOwnerId(ownerId).stream().map(sessionModel -> new UserAttendanceDTO(
                        sessionModel.getId(),
                        sessionModel.getTitle(),
                        sessionModel.getOwner().getEmail(),
                        sessionModel.getCreateAt(),
                        sessionModel.isActive()))
                .collect(Collectors.toList());
    }

    public Long getOwnedSessionsCount(Long ownerId){
        return sessionRepository.countByOwnerId(ownerId);
    }

    @GetMapping("/{id}")
    public List<UsersForSessionDTO> getAllEmailsForThisSession(Long id, Long userId){
        getSessionOwnedByUser(id, userId);
        return attendanceRepository.findAllBySessionId(id).stream().map(model ->
                        new UsersForSessionDTO(
                                model.getUser().getEmail()))
                .collect(Collectors.toList());
    }

    public SessionDetailsDTO getSessionDetails(Long id, Long userId) {
        SessionModel session = getSessionOwnedByUser(id, userId);
        return new SessionDetailsDTO(
                session.getId(),
                session.getTitle(),
                session.getPassword(),
                session.getValidationTypes(),
                session.getLatitude(),
                session.getLongitude(),
                session.getAllowedRadius(),
                session.getCreateAt(),
                session.isActive()
        );
    }

    @Transactional
    public void deleteSession(Long id, Long userId){
        getSessionOwnedByUser(id, userId);

        attendanceRepository.deleteBySessionId(id);

        sessionRepository.deleteById(id);
    }

    @Transactional
    public void updateSessionName(Long id, Long userId, SessionUpdateDTO request){
        SessionModel sessionModel = getSessionOwnedByUser(id, userId);
        sessionModel.setTitle(request.title());
    }

    @Transactional
    public void closeSession(Long id, Long userId){
        SessionModel sessionModel = getSessionOwnedByUser(id, userId);
        if (!(sessionModel.isActive())) throw new CustomException("SESSION_ALREADY_CLOSE", "This session is already closed");
        sessionModel.setActive(false);
    }

    public List<SessionResponseDTO> getAllSessions(){
        return sessionRepository.findAll().stream().map(sessionModel ->
                        new SessionResponseDTO(
                                sessionModel.getId(),
                                sessionModel.getTitle(),
                                sessionModel.getCreateAt()))
                .collect(Collectors.toList());
    }

    public List<Long> getAllaSessions(){
        return sessionRepository.findAllActiveIds();
    }

    private SessionResponseDTO mapToDTO(SessionModel sessionModel) {
        return new SessionResponseDTO(
                sessionModel.getId(),
                sessionModel.getTitle(),
                sessionModel.getCreateAt()
        );
    }

    public SessionPublicDetailsDTO getSessionPublicDetails(Long sessionId) {
        SessionModel session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new CustomException("ID_NOT_EXIST", "Session id does not exist"));
        return new SessionPublicDetailsDTO(
                session.getId(),
                session.getTitle(),
                session.getValidationTypes(),
                session.getLatitude(),
                session.getLongitude(),
                session.getAllowedRadius(),
                session.isActive()
        );
    }

    public SessionPublicDetailsDTO getSessionPublicDetailsByQrToken(String token) {
        Long sessionId = qrTokenService.validateTokenAndGetSesionId(token);
        return getSessionPublicDetails(sessionId);
    }
}
