package com.example.SPOT.controller;

import com.example.SPOT.dto.request.AttendanceCreateDTO;
import com.example.SPOT.dto.request.SessionCreateDTO;
import com.example.SPOT.dto.request.UserCreateDTO;
import com.example.SPOT.dto.request.UserLoginDTO;
import io.restassured.RestAssured;
import io.restassured.filter.session.SessionFilter;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;

import java.util.Map;
import java.util.UUID;

import com.example.SPOT.model.ValidationType;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.notNullValue;

@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT
)
@ActiveProfiles("test")
public class AttendanceIntegrationTest {

    @LocalServerPort
    private int port;

    @BeforeEach
    void setup() {
        RestAssured.port = port;
    }

    @Test
    void shouldAcceptAttendanceRequest() {
        SessionFilter sessionFilter = new SessionFilter();
        String uniqueEmail = "student_" + UUID.randomUUID() + "@innopolis.ru";

        var regDto = new UserCreateDTO(uniqueEmail, "123456Ab!");

        // 1. Registration
        given()
                .contentType(ContentType.JSON)
                .body(regDto)
                .post("/user/register")
                .then()
                .log().body()
                .statusCode(200);

        // 2. Login
        given()
                .filter(sessionFilter)
                .contentType(ContentType.JSON)
                .body(new UserLoginDTO(uniqueEmail, "123456Ab!"))
                .post("/user/login")
                .then()
                .log().body()
                .statusCode(200);

        String csrfToken = given()
                .filter(sessionFilter)
                .when()
                .get("/auth/csrf")
                .then()
                .statusCode(204)
                .extract()
                .header("XSRF-TOKEN");

        var sessionResponse = given()
            .filter(sessionFilter)
            .cookie("XSRF-TOKEN", csrfToken)
            .header("XSRF-TOKEN", csrfToken)
            .contentType(ContentType.JSON)
            .body(new SessionCreateDTO(
                "Attendance Test Session",
                null,
                null,
                null,
                "secret",
                java.util.List.of(ValidationType.PASSWORD)
            ))
            .when()
            .post("/session/create")
            .then()
            .statusCode(201)
            .extract()
            .body();

        Number sessionIdNumber = sessionResponse.path("id");
        if (sessionIdNumber == null) {
            throw new IllegalStateException("Session id was not returned by /session/create");
        }
        Long sessionId = sessionIdNumber.longValue();

        // 3. Create Attendance
        var attendance = new AttendanceCreateDTO(sessionId, Map.of("password", "secret"));

        given()
                .filter(sessionFilter)
            .cookie("XSRF-TOKEN", csrfToken)
            .header("XSRF-TOKEN", csrfToken)
                .contentType(ContentType.JSON)
                .body(attendance)
                .when()
                .post("/attendance/create")
                .then()
                .log().body()
             .statusCode(202)
             .body("payload.attendanceId", notNullValue());
    }
}