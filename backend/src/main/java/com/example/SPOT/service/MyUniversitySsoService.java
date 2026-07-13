package com.example.SPOT.service;

import java.net.URI;
import java.util.Locale;

import com.example.SPOT.dto.request.MyUniversityRedeemRequest;
import com.example.SPOT.dto.response.MyUniversityUserResponse;
import com.example.SPOT.dto.response.UserDTO;
import com.example.SPOT.exception.CustomException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.util.UriComponentsBuilder;

@Service
public class MyUniversitySsoService {
    private final RestClient restClient;
    private final UserService userService;
    private final String origin;
    private final String clientId;
    private final String clientSecret;
    private final String redirectUri;
    private final String postLoginRedirectUri;

    public MyUniversitySsoService(
            RestClient.Builder restClientBuilder,
            UserService userService,
            @Value("${my-university.oauth.origin:}") String origin,
            @Value("${my-university.oauth.client-id:}") String clientId,
            @Value("${my-university.oauth.client-secret:}") String clientSecret,
            @Value("${my-university.oauth.redirect-uri:}") String redirectUri,
            @Value("${my-university.oauth.post-login-redirect-uri:/dashboard}") String postLoginRedirectUri) {
        this.restClient = restClientBuilder.build();
        this.userService = userService;
        this.origin = trimTrailingSlash(origin);
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.redirectUri = redirectUri;
        this.postLoginRedirectUri = postLoginRedirectUri;
    }

    public URI buildAuthorizationUri() {
        ensureConfigured();

        return UriComponentsBuilder.fromUriString(origin)
                .pathSegment("services", "enter", clientId)
                .queryParam("redirect_uri", redirectUri)
                .encode()
                .build()
                .toUri();
    }

    public UserDTO redeemCode(String code) {
        ensureConfigured();

        if (code == null || code.isBlank()) {
            throw new CustomException("SSO_CODE_MISSING", "SSO authorization code is missing");
        }

        MyUniversityUserResponse response;
        try {
            response = restClient.post()
                    .uri(origin + "/api/Auth/OAuthClients/{clientId}/Redeem", clientId)
                    .header(HttpHeaders.AUTHORIZATION, "Service " + clientSecret)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(new MyUniversityRedeemRequest(clientId, code))
                    .retrieve()
                    .body(MyUniversityUserResponse.class);
        } catch (RestClientException exception) {
            throw new CustomException("SSO_REDEEM_FAILED", "Failed to redeem SSO authorization code");
        }

        if (response == null || response.email() == null || response.email().isBlank()) {
            throw new CustomException("SSO_INVALID_RESPONSE", "SSO provider returned an invalid user response");
        }

        return userService.findOrCreateSsoUser(response.email().toLowerCase(Locale.ROOT));
    }

    public URI postLoginRedirectUri() {
        return URI.create(postLoginRedirectUri);
    }

    private void ensureConfigured() {
        if (origin.isBlank() || clientId.isBlank() || clientSecret.isBlank() || redirectUri.isBlank()) {
            throw new CustomException("SSO_NOT_CONFIGURED", "My.University SSO is not configured");
        }
    }

    private String trimTrailingSlash(String value) {
        if (value == null) {
            return "";
        }

        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }
}
