package com.example.SPOT.controller;

import com.example.SPOT.dto.request.UserCreateDTO;
import com.example.SPOT.dto.request.UserLoginDTO;
import com.example.SPOT.dto.request.SessionCreateDTO;
import com.example.SPOT.dto.response.SessionResponseDTO;
import com.example.SPOT.model.ValidationType;
import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;

import java.util.UUID;

import java.util.List;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
public class SessionIntegrationTest {

    @LocalServerPort
    private int port;

    @BeforeEach
    void setup() {
        RestAssured.port = port;
    }

    @Test
    void shouldCreateAndGetAllSessions() {
        String email = "session_" + UUID.randomUUID() + "@innopolis.ru";

        given()
            .contentType(ContentType.JSON)
            .body(new UserCreateDTO(email, "Password123!"))
            .when()
            .post("/user/register")
            .then()
            .statusCode(200);

        String cookie = given()
            .contentType(ContentType.JSON)
            .body(new UserLoginDTO(email, "Password123!"))
            .when()
            .post("/user/login")
            .then()
            .statusCode(200)
            .extract()
            .cookie("JSESSIONID");

        String csrfToken = given()
            .cookie("JSESSIONID", cookie)
            .when()
            .get("/auth/csrf")
            .then()
            .statusCode(204)
            .extract()
            .header("XSRF-TOKEN");

        var sessionDto = new SessionCreateDTO("Integration Test Session", null, null, null, "secret", List.of());

        given()
            .cookie("JSESSIONID", cookie)
            .cookie("XSRF-TOKEN", csrfToken)
            .header("XSRF-TOKEN", csrfToken)
            .contentType(ContentType.JSON)
            .body(sessionDto)
            .when()
            .post("/session/create")
            .then()
            .statusCode(201)
            .body("title", equalTo("Integration Test Session"));

        given()
            .cookie("JSESSIONID", cookie)
            .when()
            .get("/session")
            .then()
            .statusCode(200)
            .body("title", hasItem("Integration Test Session"));
    }
}
