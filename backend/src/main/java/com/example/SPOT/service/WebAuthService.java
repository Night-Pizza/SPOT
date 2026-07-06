package com.example.SPOT.service;

import com.example.SPOT.dto.request.WebAuthRegistrationVerifyDTO;
import com.example.SPOT.dto.request.WebAuthAssertionVerifyDTO;
import com.example.SPOT.dto.response.WebAuthRegistrationOptionsDTO;
import com.example.SPOT.dto.response.WebAuthAssertionOptionsDTO;
import com.example.SPOT.model.UserModel;
import com.example.SPOT.repository.UserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.benmanes.caffeine.cache.Cache;
import com.yubico.webauthn.*;
import com.yubico.webauthn.data.*;
import com.yubico.webauthn.exception.AssertionFailedException;
import com.yubico.webauthn.exception.RegistrationFailedException;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.util.Collections;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class WebAuthService implements CredentialRepository {

    private static final Logger log = LoggerFactory.getLogger(WebAuthService.class);

    private final UserRepository userRepository;
    private final RelyingParty relyingParty;
    private final Cache<String, String> challengeCache;
    private final ObjectMapper objectMapper;

    public WebAuthService(UserRepository userRepository,
                           RelyingParty relyingParty,
                           @Qualifier("webauthChallengeCache") Cache<String, String> challengeCache,
                           ObjectMapper objectMapper) {
        this.userRepository = userRepository;
        this.relyingParty = relyingParty;
        this.challengeCache = challengeCache;
        this.objectMapper = objectMapper;
    }

    public WebAuthRegistrationOptionsDTO generateRegisterOptions(Long userId) {
        UserModel user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        if (user.getWebauthLastModified() != null && 
            user.getWebauthLastModified().isAfter(java.time.LocalDateTime.now().minusDays(1))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You can only modify your biometric device once a day.");
        }

        UserIdentity userIdentity = UserIdentity.builder()
                .name(user.getEmail())
                .displayName(user.getEmail())
                .id(new ByteArray(longToBytes(user.getId())))
                .build();

        PublicKeyCredentialCreationOptions options = relyingParty.startRegistration(
                StartRegistrationOptions.builder()
                        .user(userIdentity)
                        .authenticatorSelection(AuthenticatorSelectionCriteria.builder()
                                .authenticatorAttachment(AuthenticatorAttachment.PLATFORM)
                                .residentKey(ResidentKeyRequirement.REQUIRED)
                                .userVerification(UserVerificationRequirement.REQUIRED)
                                .build())
                        .build()
        );

        try {
            String optionsJson = options.toJson();
            log.info("Registration Options JSON: {}", optionsJson);
            challengeCache.put("reg:" + user.getEmail(), optionsJson);
            return new WebAuthRegistrationOptionsDTO(optionsJson);
        } catch (JsonProcessingException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to serialize registration options", e);
        }
    }

    public void verifyRegisterResponse(Long userId, WebAuthRegistrationVerifyDTO requestDto) {
        UserModel user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        String cachedOptionsJson = challengeCache.getIfPresent("reg:" + user.getEmail());
        if (cachedOptionsJson == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Registration challenge expired or not found");
        }
        challengeCache.invalidate("reg:" + user.getEmail());

        try {
            PublicKeyCredentialCreationOptions options = PublicKeyCredentialCreationOptions.fromJson(cachedOptionsJson);
            PublicKeyCredential<AuthenticatorAttestationResponse, ClientRegistrationExtensionOutputs> pkc =
                    PublicKeyCredential.parseRegistrationResponseJson(requestDto.responseJson());

            RegistrationResult result = relyingParty.finishRegistration(
                    FinishRegistrationOptions.builder()
                            .request(options)
                            .response(pkc)
                            .build()
            );

            byte[] newCredentialId = result.getKeyId().getId().getBytes();
            Optional<UserModel> existingUser = userRepository.findByWebauthCredentialId(newCredentialId);
            if (existingUser.isPresent() && !existingUser.get().getId().equals(user.getId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This device is already in use by someone else");
            }

            user.setWebauthCredentialId(newCredentialId);
            user.setWebauthPublicKey(result.getPublicKeyCose().getBytes());
            user.setWebauthSignatureCount(result.getSignatureCount());
            user.setWebauthLastModified(java.time.LocalDateTime.now());
            userRepository.save(user);

        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid JSON structure or parsing failure in client response", e);
        } catch (RegistrationFailedException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "WebAuthn registration validation failed", e);
        }
    }

    public WebAuthAssertionOptionsDTO generateAttendanceOptions(Long userId) {
        UserModel user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        if (user.getWebauthCredentialId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Please register your device first.");
        }

        AssertionRequest request = relyingParty.startAssertion(
                StartAssertionOptions.builder()
                        .username(Optional.of(user.getEmail()))
                        .userVerification(UserVerificationRequirement.REQUIRED)
                        .build()
        );

        try {
            String requestJson = request.toJson();
            log.info("Assertion Request JSON: {}", requestJson);
            challengeCache.put("auth:" + user.getEmail(), requestJson);
            return new WebAuthAssertionOptionsDTO(requestJson);
        } catch (JsonProcessingException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to serialize assertion request", e);
        }
    }

    public void verifyAttendanceResponse(Long userId, WebAuthAssertionVerifyDTO requestDto) {
        UserModel user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        String cachedRequestJson = challengeCache.getIfPresent("auth:" + user.getEmail());
        if (cachedRequestJson == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Challenge expired. You must sign within 10 seconds.");
        }
        challengeCache.invalidate("auth:" + user.getEmail());

        try {
            AssertionRequest request = AssertionRequest.fromJson(cachedRequestJson);
            PublicKeyCredential<AuthenticatorAssertionResponse, ClientAssertionExtensionOutputs> pkc =
                    PublicKeyCredential.parseAssertionResponseJson(requestDto.responseJson());

            AssertionResult result = relyingParty.finishAssertion(
                    FinishAssertionOptions.builder()
                            .request(request)
                            .response(pkc)
                            .build()
            );

            if (user.getWebauthCredentialId() == null || 
                !java.util.Arrays.equals(user.getWebauthCredentialId(), pkc.getId().getBytes())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The biometric key used does not belong to your account.");
            }

            if (result.isSuccess()) {
                if (result.getSignatureCount() > 0 && result.getSignatureCount() <= user.getWebauthSignatureCount()) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cloned authenticator detected!");
                }

                user.setWebauthSignatureCount(result.getSignatureCount());
                userRepository.save(user);
            } else {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Biometric signature verification failed");
            }

        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid JSON structure or parsing failure in assertion response", e);
        } catch (AssertionFailedException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "WebAuthn authentication validation failed", e);
        }
    }

    @Override
    public Set<PublicKeyCredentialDescriptor> getCredentialIdsForUsername(String username) {
        UserModel currentUser = userRepository.findByEmail(username);
        if (currentUser == null || currentUser.getWebauthCredentialId() == null) {
            return Collections.emptySet();
        }

        return Collections.singleton(
                PublicKeyCredentialDescriptor.builder()
                        .id(new ByteArray(currentUser.getWebauthCredentialId()))
                        .type(PublicKeyCredentialType.PUBLIC_KEY)
                        .transports(Set.of(AuthenticatorTransport.INTERNAL))
                        .build()
        );
    }

    @Override
    public Optional<ByteArray> getUserHandleForUsername(String username) {
        UserModel user = userRepository.findByEmail(username);
        if (user == null) {
            return Optional.empty();
        }
        byte[] userHandleBytes = longToBytes(user.getId());
        return Optional.of(new ByteArray(userHandleBytes));
    }

    @Override
    public Optional<String> getUsernameForUserHandle(ByteArray userHandle) {
        try {
            long userId = bytesToLong(userHandle.getBytes());
            Optional<UserModel> user = userRepository.findById(userId);
            return user.map(UserModel::getEmail);
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    @Override
    public Optional<RegisteredCredential> lookup(ByteArray credentialId, ByteArray userHandle) {
        Optional<UserModel> userOpt = userRepository.findByWebauthCredentialId(credentialId.getBytes());
        if (userOpt.isEmpty()) {
            return Optional.empty();
        }
        UserModel user = userOpt.get();
        return Optional.of(
                RegisteredCredential.builder()
                        .credentialId(credentialId)
                        .userHandle(userHandle)
                        .publicKeyCose(new ByteArray(user.getWebauthPublicKey()))
                        .signatureCount(user.getWebauthSignatureCount())
                        .build()
        );
    }

    @Override
    public Set<RegisteredCredential> lookupAll(ByteArray credentialId) {
        Optional<UserModel> userOpt = userRepository.findByWebauthCredentialId(credentialId.getBytes());
        if (userOpt.isEmpty()) {
            return Collections.emptySet();
        }
        UserModel user = userOpt.get();
        byte[] userHandle = longToBytes(user.getId());
        return Collections.singleton(
                RegisteredCredential.builder()
                        .credentialId(credentialId)
                        .userHandle(new ByteArray(userHandle))
                        .publicKeyCose(new ByteArray(user.getWebauthPublicKey()))
                        .signatureCount(user.getWebauthSignatureCount())
                        .build()
        );
    }

    private byte[] longToBytes(long x) {
        ByteBuffer buffer = ByteBuffer.allocate(Long.BYTES);
        buffer.putLong(x);
        return buffer.array();
    }

    private long bytesToLong(byte[] bytes) {
        ByteBuffer buffer = ByteBuffer.allocate(Long.BYTES);
        buffer.put(bytes);
        buffer.flip();
        return buffer.getLong();
    }
}