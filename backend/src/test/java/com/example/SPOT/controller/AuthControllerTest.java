package com.example.SPOT.controller;

import com.example.SPOT.dto.response.UserDTO;
import com.example.SPOT.handler.GlobalExceptionHandler;
import com.example.SPOT.repository.UserRepository;
import com.example.SPOT.service.MyUniversitySsoService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.net.URI;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.blankOrNullString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AuthControllerTest {
    private MyUniversitySsoService myUniversitySsoService;
    private SecurityContextRepository securityContextRepository;
    private UserRepository userRepository;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        myUniversitySsoService = org.mockito.Mockito.mock(MyUniversitySsoService.class);
        securityContextRepository = org.mockito.Mockito.mock(SecurityContextRepository.class);
        userRepository = org.mockito.Mockito.mock(UserRepository.class);

        mockMvc = MockMvcBuilders
                .standaloneSetup(new AuthController(myUniversitySsoService, securityContextRepository, userRepository))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void loginRedirectsWithoutState() throws Exception {
        when(myUniversitySsoService.buildAuthorizationUri())
                .thenReturn(URI.create("https://sso.example/login"));

        mockMvc.perform(get("/auth/my-university/login"))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", containsString("https://sso.example/login")));

        verify(myUniversitySsoService).buildAuthorizationUri();
    }

    @Test
    void callbackAuthenticatesUser() throws Exception {
        MockHttpSession session = new MockHttpSession();

        when(myUniversitySsoService.redeemCode("code-1"))
                .thenReturn(new UserDTO(7L, "teacher@innopolis.ru", false, false, false, true));
        when(myUniversitySsoService.postLoginRedirectUri())
                .thenReturn(URI.create("/dashboard"));

        mockMvc.perform(get("/auth/my-university/callback")
                        .session(session)
                        .param("code", "code-1"))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", "/dashboard"));

        verify(myUniversitySsoService).redeemCode("code-1");
        verify(securityContextRepository).saveContext(
                any(SecurityContext.class),
                any(HttpServletRequest.class),
                any(HttpServletResponse.class));
    }
}
