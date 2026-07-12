package com.example.SPOT.handler;

import com.example.SPOT.dto.error.CustomExceptionDTO;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import com.example.SPOT.exception.CustomException;

@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(CustomException.class)
    public ResponseEntity<CustomExceptionDTO> handleCustomException(CustomException ex) {
        CustomExceptionDTO error = new CustomExceptionDTO(ex.getErrorCode(), ex.getMessage());
        return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<CustomExceptionDTO> handleException(Exception ex) throws Exception {
        if (ex instanceof NoResourceFoundException) {
            throw ex;
        }
        CustomExceptionDTO error = new CustomExceptionDTO("UNEXPECTED_ERROR", ex.getMessage());
        return new ResponseEntity<>(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<CustomExceptionDTO> handleValidationException(MethodArgumentNotValidException ex) {
        String errorMessage;
        if (ex.getBindingResult().getFieldError().getDefaultMessage() == null || ex.getBindingResult().getFieldError().getDefaultMessage().isEmpty()){
            errorMessage = "Null message";
        }
        else {
            errorMessage = ex.getBindingResult().getFieldError().getDefaultMessage();
        }
        CustomExceptionDTO errors = new CustomExceptionDTO("VALIDATION_ERROR", errorMessage);
        return new ResponseEntity<>(errors, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<CustomExceptionDTO> handleAccessDeniedException(AccessDeniedException ex) {
        CustomExceptionDTO error = new CustomExceptionDTO("ACCESS_DENIED", ex.getMessage());
        return new ResponseEntity<>(error, HttpStatus.FORBIDDEN);
    }
}
 
