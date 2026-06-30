package com.example.SPOT.controller;

import com.example.SPOT.dto.request.UserCreateDTO;
import com.example.SPOT.dto.request.UserLoginDTO;
import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.KafkaContainer;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
public class UserIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15");

    @Container
    static KafkaContainer kafka = new KafkaContainer(DockerImageName.parse("confluentinc/cp-kafka:7.4.0"));

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        // Настройки БД
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);

        // Настройки Kafka
        registry.add("spring.kafka.bootstrap-servers", kafka::getBootstrapServers);
    }

    @LocalServerPort
    private int port;

    @BeforeEach
    void setup() {
        RestAssured.port = port;
    }

    @Test
    void shouldRegisterAndAccessMe() {
        var regDto = new UserCreateDTO("test@innopolis.ru", "password123");

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
                .body("email", equalTo("test@innopolis.ru"));
    }

    @Test
    void shouldLoginAndLogout() {
        given().contentType(ContentType.JSON)
                .body(new UserCreateDTO("login@innopolis.ru", "pass"))
                .post("/user/register");

        String cookie = given().contentType(ContentType.JSON)
                .body(new UserLoginDTO("login@innopolis.ru", "pass"))
                .post("/user/login")
                .then().statusCode(200).extract().cookie("JSESSIONID");

        given().cookie("JSESSIONID", cookie)
                .post("/user/logout")
                .then()
                .statusCode(200);

        given().cookie("JSESSIONID", cookie)
                .get("/user/me")
                .then()
                .statusCode(not(200));
    }
}