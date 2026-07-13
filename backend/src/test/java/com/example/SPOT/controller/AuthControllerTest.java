package com.example.SPOT.controller;

import com.example.SPOT.dto.response.UserDTO;
import com.example.SPOT.handler.GlobalExceptionHandler;
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
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        myUniversitySsoService = org.mockito.Mockito.mock(MyUniversitySsoService.class);
        securityContextRepository = org.mockito.Mockito.mock(SecurityContextRepository.class);

        mockMvc = MockMvcBuilders
                .standaloneSetup(new AuthController(myUniversitySsoService, securityContextRepository))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void loginStoresStateAndRedirectsWithState() throws Exception {
        when(myUniversitySsoService.buildAuthorizationUri(any(String.class)))
                .thenAnswer(invocation -> URI.create(
                        "https://sso.example/login?state=" + invocation.getArgument(0, String.class)));

        mockMvc.perform(get("/auth/my-university/login"))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", containsString("https://sso.example/login?state=")))
                .andExpect(request().sessionAttribute(
                        AuthController.SSO_STATE_SESSION_ATTRIBUTE,
                        not(blankOrNullString())));

        ArgumentCaptor<String> stateCaptor = ArgumentCaptor.forClass(String.class);
        verify(myUniversitySsoService).buildAuthorizationUri(stateCaptor.capture());
    }

    @Test
    void callbackRejectsInvalidStateBeforeRedeemingCode() throws Exception {
        MockHttpSession session = new MockHttpSession();
        session.setAttribute(AuthController.SSO_STATE_SESSION_ATTRIBUTE, "expected-state");

        mockMvc.perform(get("/auth/my-university/callback")
                        .session(session)
                        .param("code", "code-1")
                        .param("state", "wrong-state"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value("SSO_STATE_INVALID"));

        verify(myUniversitySsoService, never()).redeemCode(any(String.class));
    }

    @Test
    void callbackRejectsMissingStateBeforeRedeemingCode() throws Exception {
        MockHttpSession session = new MockHttpSession();
        session.setAttribute(AuthController.SSO_STATE_SESSION_ATTRIBUTE, "expected-state");

        mockMvc.perform(get("/auth/my-university/callback")
                        .session(session)
                        .param("code", "code-1"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value("SSO_STATE_INVALID"));

        verify(myUniversitySsoService, never()).redeemCode(any(String.class));
    }

    @Test
    void callbackAcceptsValidStateAndAuthenticatesUser() throws Exception {
        MockHttpSession session = new MockHttpSession();
        session.setAttribute(AuthController.SSO_STATE_SESSION_ATTRIBUTE, "expected-state");

        when(myUniversitySsoService.redeemCode("code-1"))
                .thenReturn(new UserDTO(7L, "teacher@innopolis.ru", false, false));
        when(myUniversitySsoService.postLoginRedirectUri())
                .thenReturn(URI.create("/dashboard"));

        mockMvc.perform(get("/auth/my-university/callback")
                        .session(session)
                        .param("code", "code-1")
                        .param("state", "expected-state"))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", "/dashboard"));

        verify(myUniversitySsoService).redeemCode("code-1");
        verify(securityContextRepository).saveContext(
                any(SecurityContext.class),
                any(HttpServletRequest.class),
                any(HttpServletResponse.class));
    }
}
