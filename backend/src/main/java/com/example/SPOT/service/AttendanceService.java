package com.example.SPOT.service;

import com.example.SPOT.dto.request.AttendanceCreateDTO;
import com.example.SPOT.dto.request.DeleteAttendanceRequestDTO;
import com.example.SPOT.dto.request.EmailAttendanceRequestDTO;
import com.example.SPOT.dto.response.AttendanceResponseDTO;
import com.example.SPOT.dto.response.UserAttendanceDTO;
import com.example.SPOT.model.AttendanceModel;
import com.example.SPOT.model.SessionModel;
import com.example.SPOT.model.UserModel;
import com.example.SPOT.model.ValidationType;
import com.example.SPOT.repository.AttendanceRepository;
import com.example.SPOT.repository.UserRepository;
import org.springframework.stereotype.Service;
import com.example.SPOT.exception.CustomException;
import com.example.SPOT.repository.SessionRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class AttendanceService {
    private final SessionRepository sessionRepository;
    private final UserRepository userRepository;
    private final AttendanceRepository attendanceRepository;

    public AttendanceService(SessionRepository sessionRepository, UserRepository userRepository, AttendanceRepository attendanceRepository) {
        this.sessionRepository = sessionRepository;
        this.userRepository = userRepository;
        this.attendanceRepository = attendanceRepository;
    }

    public AttendanceResponseDTO createAttendance(Long userId, AttendanceCreateDTO request){
        if (attendanceRepository.existsByUserIdAndSessionId(userId, request.sessionId()))
            throw new CustomException("USER_ALREADY_ATTENDED_SESSION", "User with this this id has already attended session with this id");

        SessionModel session = sessionRepository.findById(request.sessionId()).orElseThrow(() -> new CustomException("SESSION_ID_NOT_EXIST","SESSION id does not exist"));
        if (!session.isActive()) throw new CustomException("SESSION_IS_CLOSED", "Session is already closed");

        if (session.getValidationTypes() != null) {
            for (ValidationType type : session.getValidationTypes()) {
                validateAttendanceRequirements(type, session, request);
            }
        }

        AttendanceModel attendanceModel = new AttendanceModel();
        attendanceModel.setUser(userRepository.findById(userId).orElseThrow( () -> new CustomException("USER_ID_NOT_EXIST","User id does not exist")));
        attendanceModel.setSession(session);
        attendanceModel.setTimestamp(LocalDateTime.now());

        return mapToDTO(attendanceRepository.save(attendanceModel));
    }

    public AttendanceResponseDTO createAttendanceByEmail(EmailAttendanceRequestDTO request){
        if (!(userRepository.existsByEmail(request.email())))
            throw new CustomException("NO_SUCH_USER", "User with this this email does not exists.");

        UserModel user = userRepository.findByEmail(request.email());
        Long userId = user.getId();
        if (attendanceRepository.existsByUserIdAndSessionId(userId, request.sessionId()))
            throw new CustomException("USER_ALREADY_ATTENDED_SESSION", "User with this this id has already attended session with this id");

        SessionModel session = sessionRepository.findById(request.sessionId()).orElseThrow(() -> new CustomException("SESSION_ID_NOT_EXIST","SESSION id does not exist"));
        if (!session.isActive()) throw new CustomException("SESSION_IS_CLOSED", "Session is already closed");

        AttendanceModel attendanceModel = new AttendanceModel();
        attendanceModel.setUser(userRepository.findById(userId).orElseThrow( () -> new CustomException("USER_ID_NOT_EXIST","User id does not exist")));
        attendanceModel.setSession(session);
        attendanceModel.setTimestamp(LocalDateTime.now());

        return mapToDTO(attendanceRepository.save(attendanceModel));
    }

    public void deleteAttendance(DeleteAttendanceRequestDTO request){
        if (!(userRepository.existsByEmail(request.email())))
            throw new CustomException("EMAIL_NOT_EXIST","Email does not exist");
        if (!(sessionRepository.existsById(request.sessionId())))
            throw new CustomException("SESSION_DOES_NOT_EXISTS", "Session with this id does not exists");
        UserModel user = userRepository.findByEmail(request.email());
        Long userId = user.getId();
        if (!(attendanceRepository.existsByUserIdAndSessionId(userId, request.sessionId())))
            throw new CustomException("USER_HAS_NOT_ATTENDED_SESSION", "User with this this id has NOT attended session with this id");

        attendanceRepository.deleteById(attendanceRepository.findByUserIdAndSessionId(userId, request.sessionId()).getId());
    }

    public void deleteMyAttendance(Long id){
        if (!(attendanceRepository.existsById(id)))
            throw new CustomException("ID_NOT_EXIST","Attendance id does not exist");
        attendanceRepository.deleteById(id);
    }

    public List<UserAttendanceDTO> getAllUserAttendance(Long id){
        return attendanceRepository.findAllByUserId(id).stream().map(attendanceModel -> new UserAttendanceDTO(
                        attendanceModel.getId(),
                        attendanceModel.getSession().getTitle(),
                        attendanceModel.getSession().getOwner().getEmail(),
                        attendanceModel.getTimestamp()))
                .collect(Collectors.toList());
    }

    public List<AttendanceResponseDTO> getAllAttendance(){
        return attendanceRepository.findAll().stream().map(attendanceModel -> new AttendanceResponseDTO(
                        attendanceModel.getId(),
                        attendanceModel.getTimestamp()))
                .collect(Collectors.toList());
    }

    private AttendanceResponseDTO mapToDTO(AttendanceModel attendanceModel) {
        return new AttendanceResponseDTO(
                attendanceModel.getId(),
                attendanceModel.getTimestamp()
        );
    }

    private void validateAttendanceRequirements(ValidationType type, SessionModel session, AttendanceCreateDTO request) {
        if (type == ValidationType.PASSWORD) {
            if (request.payload() == null || !request.payload().containsKey("password")) {
                throw new CustomException("MISSING_PASSWORD_DATA", "Password validation requires a password in payload");
            }
            String studentPassword = request.payload().get("password").toString();
            if (!studentPassword.equals(session.getPassword())) {
                throw new CustomException("INVALID_PASSWORD", "The provided password does not match the session password");
            }
        }
        else if (type == ValidationType.GPS) {
            if (request.payload() == null || !request.payload().containsKey("latitude") || !request.payload().containsKey("longitude")) {
                throw new CustomException("MISSING_GPS_DATA", "GPS validation requires latitude and longitude in payload");
            }
            Double studentLat = Double.valueOf(request.payload().get("latitude").toString());
            Double studentLong = Double.valueOf(request.payload().get("longitude").toString());
            boolean inClass = isInClass(session.getLatitude(), session.getLongitude(), session.getAllowedRadius(), studentLat, studentLong);
            if (!inClass) throw new CustomException("OUT_OF_ATTENDANCE_RADIUS", "User is out of attendance radius");
        }
        else if (type == ValidationType.NONE) {
            // Skipped for the reason
        }
        else {
            throw new CustomException("UNSUPPORTED_VALIDATION_TYPE", "Unsupported validation type: " + type);
        }
    }

    private boolean isInClass(Double originalLat, Double originalLong, Double allowedRadius, Double studentLat, Double studentLong) {
        final int EARTH_RADIUS_METERS = 6371000;

        double dLat = Math.toRadians(originalLat - studentLat);
        double dLon = Math.toRadians(originalLong - studentLong);

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(Math.toRadians(studentLat)) * Math.cos(Math.toRadians(originalLat)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        double distance = EARTH_RADIUS_METERS * c;

        return distance <= allowedRadius;
    }

}