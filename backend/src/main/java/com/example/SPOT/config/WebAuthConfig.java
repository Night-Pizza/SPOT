package com.example.SPOT.config;

import com.example.SPOT.service.WebAuthService;
import com.yubico.webauthn.RelyingParty;
import com.yubico.webauthn.data.RelyingPartyIdentity;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;

@Configuration
public class WebAuthConfig {

    @Value("${webauthn.rp-id}")
    private String rpId;

    @Value("${webauthn.rp-name}")
    private String rpName;

    @Bean
    public RelyingParty relyingParty(@Lazy WebAuthService webAuthService) {
        RelyingPartyIdentity rpIdentity = RelyingPartyIdentity.builder()
                .id(rpId)
                .name(rpName)
                .build();

        return RelyingParty.builder()
                .identity(rpIdentity)
                .credentialRepository(webAuthService)
                .build();
    }
}