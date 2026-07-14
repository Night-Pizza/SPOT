package com.example.SPOT.controller;

import com.example.SPOT.dto.request.UserCreateDTO;
import com.example.SPOT.dto.request.UserLoginDTO;
import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;

import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
public class UserIntegrationTest {

    @LocalServerPort
    private int port;

    @BeforeEach
    void setup() {
        RestAssured.port = port;
    }

    @Test
    void shouldRegisterAndAccessMe() {
        String email = "test_" + UUID.randomUUID() + "@example.com";
                var regDto = new UserCreateDTO(email, "Password123!");

        String cookie = given()
                .contentType(ContentType.JSON)
                .body(regDto)
                .when()
                .post("/user/register")
                .then()
                .statusCode(200)
                .extract().cookie("JSESSIONID");

        given()
                .cookie("JSESSIONID", cookie)
                .when()
                .get("/user/me")
                .then()
                .statusCode(200)
                .body("email", equalTo(email));
    }

    @Test
    void shouldLoginAndLogout() {
        String email = "login_" + UUID.randomUUID() + "@example.com";

        given().contentType(ContentType.JSON)
                .body(new UserCreateDTO(email, "Password123!"))
                .post("/user/register");

        String cookie = given().contentType(ContentType.JSON)
                .body(new UserLoginDTO(email, "Password123!"))
                .post("/user/login")
                .then().statusCode(200).extract().cookie("JSESSIONID");

        String csrfToken = given()
                .cookie("JSESSIONID", cookie)
                .when()
                .get("/auth/csrf")
                .then()
                .statusCode(204)
                .extract()
                .header("XSRF-TOKEN");

        given()
                .cookie("JSESSIONID", cookie)
                .cookie("XSRF-TOKEN", csrfToken)
                .header("XSRF-TOKEN", csrfToken)
                .post("/user/logout")
                .then()
                .statusCode(200);

        given().cookie("JSESSIONID", cookie)
                .get("/user/me")
                .then()
                .statusCode(not(200));
    }
}