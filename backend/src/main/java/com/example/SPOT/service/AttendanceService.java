package com.example.SPOT.service;

import com.example.SPOT.dto.request.AttendanceCreateDTO;
import com.example.SPOT.dto.response.AttendanceResponseDTO;
import com.example.SPOT.dto.response.UserAttendanceDTO;
import com.example.SPOT.model.AttendanceModel;
import com.example.SPOT.model.SessionModel;
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

        AttendanceModel attendanceModel = new AttendanceModel();
        attendanceModel.setUser(userRepository.findById(userId).orElseThrow( () -> new CustomException("USER_ID_NOT_EXIST","User id does not exist")));
        attendanceModel.setSession(session);
        attendanceModel.setTimestamp(LocalDateTime.now());
        
        return mapToDTO(attendanceRepository.save(attendanceModel));
    }



    public void deleteAttendance(Long id){
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
    

}