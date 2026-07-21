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

import java.io.IOException;
import java.nio.ByteBuffer;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class WebAuthService implements CredentialRepository {

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

    // Generates WebAuthn registration options for a user.
    // It also fetches other credentials to exclude them, ensuring the user doesn't register the same device multiple times.
    public WebAuthRegistrationOptionsDTO generateRegisterOptions(Long userId) {
        UserModel user = getUserOrThrow(userId);

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
                                .residentKey(ResidentKeyRequirement.PREFERRED)
                                .userVerification(UserVerificationRequirement.REQUIRED)
                                .build())
                        .build()
        );

        Set<PublicKeyCredentialDescriptor> otherCredentials = userRepository.findAll().stream()
                .filter(u -> u.getWebauthCredentialId() != null && !u.getId().equals(user.getId()))
                .map(u -> PublicKeyCredentialDescriptor.builder()
                        .id(new ByteArray(u.getWebauthCredentialId()))
                        .type(PublicKeyCredentialType.PUBLIC_KEY)
                        .transports(Set.of(AuthenticatorTransport.INTERNAL))
                        .build())
                .collect(Collectors.toSet());

        if (!otherCredentials.isEmpty()) {
            options = options.toBuilder()
                    .excludeCredentials(Optional.of(otherCredentials))
                    .build();
        }

        try {
            String optionsJson = options.toJson();
            challengeCache.put("reg:" + user.getEmail(), optionsJson);
            return new WebAuthRegistrationOptionsDTO(optionsJson);
        } catch (JsonProcessingException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to serialize registration options", e);
        }
    }

    // Validates the WebAuthn registration response from the client.
    // It checks if the physical device (fingerprint) is already bound to another user and prevents duplicate registrations.
    public void verifyRegisterResponse(Long userId, WebAuthRegistrationVerifyDTO requestDto) {
        UserModel user = getUserOrThrow(userId);

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
            requireUniqueCredentialId(newCredentialId, user.getId());

            Optional<UserModel> deviceOwner = userRepository.findByWebauthDeviceFingerprint(requestDto.deviceFingerprint());
            if (deviceOwner.isPresent() && !deviceOwner.get().getId().equals(user.getId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This physical device is already registered to another user.");
            }

            user.setWebauthCredentialId(newCredentialId);
            user.setWebauthPublicKey(result.getPublicKeyCose().getBytes());
            user.setWebauthSignatureCount(result.getSignatureCount());
            user.setWebauthDeviceFingerprint(requestDto.deviceFingerprint());
            user.setWebauthLastModified(java.time.LocalDateTime.now());
            userRepository.save(user);

        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid JSON structure or parsing failure in client response", e);
        } catch (RegistrationFailedException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "WebAuthn registration validation failed", e);
        }
    }

    public WebAuthAssertionOptionsDTO generateAttendanceOptions(Long userId) {
        UserModel user = getUserOrThrow(userId);

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
            challengeCache.put("auth:" + user.getEmail(), requestJson);
            return new WebAuthAssertionOptionsDTO(requestJson);
        } catch (JsonProcessingException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to serialize assertion request", e);
        }
    }

    // Validates the WebAuthn assertion (authentication) response.
    // It performs security checks including signature count verification to detect cloned authenticators.
    public void verifyAttendanceResponse(Long userId, WebAuthAssertionVerifyDTO requestDto) {
        UserModel user = getUserOrThrow(userId);

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

            // Verify the credential belongs to THIS user
            if (user.getWebauthCredentialId() == null ||
                !java.util.Arrays.equals(user.getWebauthCredentialId(), pkc.getId().getBytes())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The biometric key used does not belong to your account.");
            }

            if (user.getWebauthDeviceFingerprint() != null &&
                !user.getWebauthDeviceFingerprint().equals(requestDto.deviceFingerprint())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unrecognized physical device. Please use the device you originally registered.");
            }

            // Verify the same physical credential is not registered to a different account
            // (catches cases where the same device was registered to multiple accounts before the excludeCredentials fix)
            requireUniqueCredentialId(pkc.getId().getBytes(), user.getId());

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
        return createRegisteredCredential(credentialId, userHandle);
    }

    @Override
    public Set<RegisteredCredential> lookupAll(ByteArray credentialId) {
        return createRegisteredCredential(credentialId, null)
                .map(Collections::singleton)
                .orElse(Collections.emptySet());
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

    private UserModel getUserOrThrow(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private void requireUniqueCredentialId(byte[] credentialId, Long currentUserId) {
        userRepository.findByWebauthCredentialId(credentialId).ifPresent(existingUser -> {
            if (!existingUser.getId().equals(currentUserId)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This device is already in use by someone else");
            }
        });
    }

    private Optional<RegisteredCredential> createRegisteredCredential(ByteArray credentialId, ByteArray userHandleOpt) {
        return userRepository.findByWebauthCredentialId(credentialId.getBytes())
                .map(user -> {
                    ByteArray userHandle = userHandleOpt != null ? userHandleOpt : new ByteArray(longToBytes(user.getId()));
                    return RegisteredCredential.builder()
                            .credentialId(credentialId)
                            .userHandle(userHandle)
                            .publicKeyCose(new ByteArray(user.getWebauthPublicKey()))
                            .signatureCount(user.getWebauthSignatureCount())
                            .build();
                });
    }
}