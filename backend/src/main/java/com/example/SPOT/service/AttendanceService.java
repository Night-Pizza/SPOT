package com.example.SPOT.service;

import com.example.SPOT.dto.request.QrScanRequestDTO;
import com.example.SPOT.dto.request.AttendanceCreateDTO;
import com.example.SPOT.dto.request.DeleteAttendanceRequestDTO;
import com.example.SPOT.dto.request.EmailAttendanceRequestDTO;
import com.example.SPOT.dto.response.AttendDTO;
import com.example.SPOT.dto.response.AttendanceResponseDTO;
import com.example.SPOT.dto.response.UserAttendanceDTO;
import com.example.SPOT.dto.response.UsersForSessionDTO;
import com.example.SPOT.kafka.KafkaMessagingService;
import com.example.SPOT.model.AttendanceModel;
import com.example.SPOT.model.EmbeddingStatus;
import com.example.SPOT.model.KafkaModel;
import com.example.SPOT.model.SessionModel;
import com.example.SPOT.model.UserModel;
import com.example.SPOT.model.ValidationType;
import com.example.SPOT.repository.AttendanceRepository;
import com.example.SPOT.repository.KafkaRepository;
import com.example.SPOT.repository.UserRepository;
import org.springframework.stereotype.Service;
import com.example.SPOT.exception.CustomException;
import com.example.SPOT.repository.SessionRepository;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import jakarta.servlet.http.HttpServletResponse;
import java.io.PrintWriter;
import java.io.IOException;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVPrinter;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AttendanceService {
    private final SessionRepository sessionRepository;
    private final UserRepository userRepository;
    private final AttendanceRepository attendanceRepository;
    private final KafkaMessagingService kafka;
    private final KafkaRepository kafkaRepository;
    private final QRTokenService qrTokenService;
    private final SessionService sessionService;

    public AttendanceService(SessionRepository sessionRepository, UserRepository userRepository, AttendanceRepository attendanceRepository,
                             KafkaMessagingService kafka, KafkaRepository kafkaRepository, QRTokenService qrTokenService, SessionService sessionService) {
        this.sessionRepository = sessionRepository;
        this.userRepository = userRepository;
        this.attendanceRepository = attendanceRepository;
        this.kafka = kafka;
        this.kafkaRepository = kafkaRepository;
        this.qrTokenService = qrTokenService;
        this.sessionService = sessionService;
    }

    public AttendDTO createAttendance(Long userId, AttendanceCreateDTO request){
        if (attendanceRepository.existsByUserIdAndSessionId(userId, request.sessionId()))
            throw new CustomException("USER_ALREADY_ATTENDED_SESSION", "User with this this id has already attended session with this id");

        SessionModel session = sessionRepository.findById(request.sessionId()).orElseThrow(() -> new CustomException("SESSION_ID_NOT_EXIST","SESSION id does not exist"));
        if (!session.isActive()) throw new CustomException("SESSION_IS_CLOSED", "Session is already closed");

        Long requestId = null;

        if (session.getValidationTypes() != null) {
            for (ValidationType type : session.getValidationTypes()) {
                Long id = validateAttendanceRequirements(userId, type, session, request);
                if (type == ValidationType.FACE) {
                    requestId = id;
                }
            }
        }

        if (requestId != null) {
            return new AttendDTO (Map.of ("requestId", requestId));
        }

        AttendanceModel attendanceModel = new AttendanceModel();
        attendanceModel.setUser(userRepository.findById(userId).orElseThrow( () -> new CustomException("USER_ID_NOT_EXIST","User id does not exist")));
        attendanceModel.setSession(session);
        attendanceModel.setTimestamp(LocalDateTime.now());

        attendanceRepository.save(attendanceModel);

        return new AttendDTO(Map.of("attendanceId", attendanceModel.getId()));
    }


    public AttendanceResponseDTO createAttendanceByEmail(EmailAttendanceRequestDTO request, Long currentUserId){
        SessionModel session = sessionService.getSessionOwnedByUser(request.sessionId(), currentUserId);
        if (!(userRepository.existsByEmail(request.email())))
            throw new CustomException("NO_SUCH_USER", "User with this this email does not exists.");

        UserModel user = userRepository.findByEmail(request.email());
        Long userId = user.getId();
        if (attendanceRepository.existsByUserIdAndSessionId(userId, request.sessionId()))
            throw new CustomException("USER_ALREADY_ATTENDED_SESSION", "User with this this id has already attended session with this id");

        if (!session.isActive()) throw new CustomException("SESSION_IS_CLOSED", "Session is already closed");

        AttendanceModel attendanceModel = new AttendanceModel();
        attendanceModel.setUser(userRepository.findById(userId).orElseThrow( () -> new CustomException("USER_ID_NOT_EXIST","User id does not exist")));
        attendanceModel.setSession(session);
        attendanceModel.setTimestamp(LocalDateTime.now());

        return mapToDTO(attendanceRepository.save(attendanceModel));
    }

    public void deleteAttendance(DeleteAttendanceRequestDTO request, Long currentUserId){
        sessionService.getSessionOwnedByUser(request.sessionId(), currentUserId);
        if (!(userRepository.existsByEmail(request.email())))
            throw new CustomException("EMAIL_NOT_EXIST","Email does not exist");
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

    public List<UsersForSessionDTO> getAllAttendanceBySession(Long id){
        return attendanceRepository.findAllBySessionId(id).stream().map(attendanceModel -> new UsersForSessionDTO(
                        attendanceModel.getUser().getEmail()))
                .collect(Collectors.toList());
    }

    public List<AttendanceResponseDTO> getAllAttendance(){
        return attendanceRepository.findAll().stream().map(attendanceModel -> new AttendanceResponseDTO(
                        attendanceModel.getId(),
                        attendanceModel.getTimestamp()))
                .collect(Collectors.toList());
    }

    public Long getAttendedSessionsCount(Long id){
        return attendanceRepository.countByUserId(id);
    }

    @Transactional(readOnly = true)
    public void exportAttendance(Long sessionId, String format, HttpServletResponse response) throws IOException {
        SessionModel session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new CustomException("SESSION_NOT_FOUND", "Session not found"));
        
        response.setCharacterEncoding("UTF-8");
        
        try (PrintWriter writer = response.getWriter();
             Stream<AttendanceModel> stream = attendanceRepository.streamBySessionId(sessionId)) {
            
            if ("csv".equalsIgnoreCase(format)) {
                response.setContentType("text/csv");
                response.setHeader("Content-Disposition", "attachment; filename=\"attendance_" + sessionId + ".csv\"");
                
                try (CSVPrinter csvPrinter = new CSVPrinter(writer, CSVFormat.DEFAULT.builder().setHeader("email", "stage", "time", "manual").build())) {
                    DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss");
                    stream.forEach(attendance -> {
                        try {
                            String email = attendance.getUser().getEmail();
                            String time = attendance.getTimestamp() != null ? attendance.getTimestamp().format(formatter) : "";
                            csvPrinter.printRecord(email, "0", time, "0");
                        } catch (IOException e) {
                            throw new RuntimeException("Error writing CSV", e);
                        }
                    });
                }
            } else if ("moodle".equalsIgnoreCase(format)) {
                response.setContentType("text/csv");
                response.setHeader("Content-Disposition", "attachment; filename=\"attendance_moodle_" + sessionId + ".csv\"");
                
                try (CSVPrinter csvPrinter = new CSVPrinter(writer, CSVFormat.DEFAULT.builder().setHeader("External user field", "status").build())) {
                    stream.forEach(attendance -> {
                        try {
                            String email = attendance.getUser().getEmail();
                            csvPrinter.printRecord(email, "P");
                        } catch (IOException e) {
                            throw new RuntimeException("Error writing CSV", e);
                        }
                    });
                }
            } else if ("txt".equalsIgnoreCase(format)) {
                response.setContentType("text/plain");
                response.setHeader("Content-Disposition", "attachment; filename=\"attendance_" + sessionId + ".txt\"");
                
                stream.forEach(attendance -> {
                    writer.println(attendance.getUser().getEmail());
                });
            } else {
                throw new CustomException("INVALID_FORMAT", "Unsupported export format");
            }
        }
    }

    private AttendanceResponseDTO mapToDTO(AttendanceModel attendanceModel) {
        return new AttendanceResponseDTO(
                attendanceModel.getId(),
                attendanceModel.getTimestamp()
        );
    }

    private Long validateAttendanceRequirements(Long userId, ValidationType type, SessionModel session, AttendanceCreateDTO request) {
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
        else if (type == ValidationType.FACE) {
            Long requestId = validateFace(userId, session.getId(), request);
            return requestId;
        }
        else if (type == ValidationType.NONE) {
            // Skipped for the reason
        }
        else {
            throw new CustomException("UNSUPPORTED_VALIDATION_TYPE", "Unsupported validation type: " + type);
        }
        return 0L;
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

    private Long validateFace(Long userId, Long sessionId, AttendanceCreateDTO request) {
        if (request.payload() == null || !request.payload().containsKey("images")) {
            throw new CustomException("MISSING_FACE_RECOGNITION_DATA", "Face Recognition requires exactly 3 images");
        }

        Object imagesObj = request.payload().get("images");
        if (!(imagesObj instanceof List)) {
            throw new CustomException("INVALID_image_DATA", "images must be a list");
        }

        List<String> images = (List<String>) imagesObj;
        if (images.size() != 3) {
            throw new CustomException("MISSING_FACE_RECOGNITION_DATA", "Face Recognition requires exactly 3 images");
        }

        KafkaModel kafkaRequest = new KafkaModel(
                null,
                userId,
                sessionId,
                EmbeddingStatus.PENDING_FOR_ATTENDANCE,
                0,
                null,
                java.time.LocalDateTime.now()
        );
        kafkaRepository.save(kafkaRequest);

        for (String image : images) {
            if (image == null || image.isEmpty()) {
                throw new CustomException("INVALID_image_DATA", "Each image must be a non-empty string");
            }
            kafka.dispatchFace(kafkaRequest.getId(), userId, image);
        }

        return kafkaRequest.getId();
    }

}
