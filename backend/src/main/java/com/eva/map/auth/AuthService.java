package com.eva.map.auth;

import com.eva.map.common.BadRequestException;
import com.eva.map.common.ConflictException;
import com.eva.map.common.NotFoundException;
import com.eva.map.user.User;
import com.eva.map.user.UserRepository;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class AuthService {

    private static final Map<String, String> IMAGE_TYPES = Map.of(
            ".jpg", MediaType.IMAGE_JPEG_VALUE,
            ".jpeg", MediaType.IMAGE_JPEG_VALUE,
            ".png", MediaType.IMAGE_PNG_VALUE,
            ".webp", "image/webp",
            ".gif", MediaType.IMAGE_GIF_VALUE
    );
    private static final Set<String> ALLOWED_TYPES = Set.copyOf(IMAGE_TYPES.values());

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final MailService mailService;
    private final Path uploadDir;
    private final String publicUrl;
    private final SecureRandom random = new SecureRandom();

    public AuthService(
            UserRepository userRepository,
            PasswordResetTokenRepository passwordResetTokenRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            MailService mailService,
            @Value("${app.upload.dir}") String uploadDir,
            @Value("${app.public-url}") String publicUrl
    ) throws IOException {
        this.userRepository = userRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.mailService = mailService;
        this.uploadDir = Path.of(uploadDir).toAbsolutePath().normalize();
        this.publicUrl = publicUrl.endsWith("/") ? publicUrl.substring(0, publicUrl.length() - 1) : publicUrl;
        Files.createDirectories(this.uploadDir);
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = request.email().trim().toLowerCase();
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new ConflictException("Email is already registered");
        }
        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setDisplayName(request.displayName().trim());
        userRepository.save(user);
        return toAuthResponse(user);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmailIgnoreCase(request.email().trim())
                .orElseThrow(() -> new BadCredentialsException("Invalid credentials"));
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid credentials");
        }
        return toAuthResponse(user);
    }

    @Transactional
    public MessageResponse forgotPassword(ForgotPasswordRequest request) {
        String email = request.email().trim();
        userRepository.findByEmailIgnoreCase(email).ifPresent(user -> {
            passwordResetTokenRepository.deleteByUserId(user.getId());
            String token = newToken();
            PasswordResetToken row = new PasswordResetToken();
            row.setUser(user);
            row.setTokenHash(hashToken(token));
            row.setExpiresAt(Instant.now().plus(Duration.ofHours(1)));
            passwordResetTokenRepository.save(row);
            mailService.sendPasswordReset(
                    user.getEmail(),
                    user.getDisplayName(),
                    publicUrl + "/reset-password?token=" + token
            );
        });
        return new MessageResponse("Если такой email есть в Rutrip, отправим ссылку для нового пароля.");
    }

    @Transactional
    public AuthResponse resetPassword(ResetPasswordRequest request) {
        PasswordResetToken row = passwordResetTokenRepository.findByTokenHash(hashToken(request.token().trim()))
                .orElseThrow(() -> new BadRequestException("Ссылка устарела или уже использована. Запроси новую."));
        if (row.getUsedAt() != null || row.getExpiresAt().isBefore(Instant.now())) {
            throw new BadRequestException("Ссылка устарела или уже использована. Запроси новую.");
        }
        User user = row.getUser();
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        passwordResetTokenRepository.deleteByUserId(user.getId());
        return toAuthResponse(user);
    }

    @Transactional(readOnly = true)
    public MeResponse me(User user) {
        return toMe(requireUser(user.getId()));
    }

    @Transactional
    public MeResponse update(User user, UpdateMeRequest request) {
        User stored = requireUser(user.getId());
        boolean changed = false;
        if (request.displayName() != null) {
            stored.setDisplayName(request.displayName().trim());
            changed = true;
        }
        if (request.mapColor() != null) {
            stored.setMapColor(request.mapColor().toLowerCase(Locale.ROOT));
            changed = true;
        }
        if (!changed) {
            throw new BadRequestException("Нечего менять");
        }
        return toMe(stored);
    }

    @Transactional
    public MeResponse updateAvatar(User user, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Нужно фото");
        }
        String originalName = file.getOriginalFilename() == null ? "" : file.getOriginalFilename();
        String extension = extensionOf(originalName);
        String contentType = resolveContentType(file.getContentType(), extension);
        if (!ALLOWED_TYPES.contains(contentType)) {
            throw new BadRequestException("Можно загружать JPEG, PNG, WebP или GIF");
        }
        User stored = requireUser(user.getId());
        String filename = "avatar-" + stored.getId() + (extension.isEmpty() ? extensionFor(contentType) : extension);
        Path target = uploadDir.resolve(filename);
        deleteAvatarFile(stored);
        try (InputStream input = file.getInputStream()) {
            Files.copy(input, target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException ex) {
            throw new IllegalStateException("Could not store file", ex);
        }
        stored.setAvatarPath(filename);
        return toMe(stored);
    }

    @Transactional
    public MeResponse deleteAvatar(User user) {
        User stored = requireUser(user.getId());
        deleteAvatarFile(stored);
        stored.setAvatarPath(null);
        return toMe(stored);
    }

    @Transactional(readOnly = true)
    public LoadedAvatar loadAvatar(UUID userId) {
        User stored = requireUser(userId);
        if (stored.getAvatarPath() == null || stored.getAvatarPath().isBlank()) {
            throw new NotFoundException("Нет фото");
        }
        Path path = uploadDir.resolve(stored.getAvatarPath()).normalize();
        if (!path.startsWith(uploadDir) || !Files.exists(path)) {
            throw new NotFoundException("Нет фото");
        }
        String contentType = IMAGE_TYPES.getOrDefault(extensionOf(stored.getAvatarPath()), MediaType.IMAGE_JPEG_VALUE);
        return new LoadedAvatar(new FileSystemResource(path), contentType);
    }

    private void deleteAvatarFile(User user) {
        if (user.getAvatarPath() == null || user.getAvatarPath().isBlank()) {
            return;
        }
        Path path = uploadDir.resolve(user.getAvatarPath()).normalize();
        try {
            if (path.startsWith(uploadDir)) {
                Files.deleteIfExists(path);
            }
        } catch (IOException ignored) {
            // leftover file is cleaned up later
        }
    }

    private User requireUser(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Пользователь не найден"));
    }

    private AuthResponse toAuthResponse(User user) {
        return new AuthResponse(
                jwtService.createToken(user.getEmail()),
                user.getId(),
                user.getEmail(),
                user.getDisplayName(),
                avatarUrl(user),
                mapColor(user)
        );
    }

    private MeResponse toMe(User user) {
        return new MeResponse(user.getId(), user.getEmail(), user.getDisplayName(), avatarUrl(user), mapColor(user));
    }

    public static String mapColor(User user) {
        String color = user.getMapColor();
        if (color == null || color.isBlank()) {
            return "#3b82f6";
        }
        return color;
    }

    public static String avatarUrl(User user) {
        if (user.getAvatarPath() == null || user.getAvatarPath().isBlank()) {
            return null;
        }
        return "/api/avatars/" + user.getId();
    }

    private String resolveContentType(String reported, String extension) {
        if (reported != null && ALLOWED_TYPES.contains(reported)) {
            return reported;
        }
        String fromName = IMAGE_TYPES.get(extension);
        return fromName == null ? (reported == null ? "" : reported) : fromName;
    }

    private String extensionOf(String filename) {
        int dot = filename.lastIndexOf('.');
        return dot < 0 ? "" : filename.substring(dot).toLowerCase(Locale.ROOT);
    }

    private String extensionFor(String contentType) {
        return IMAGE_TYPES.entrySet().stream()
                .filter(entry -> entry.getValue().equals(contentType))
                .map(Map.Entry::getKey)
                .findFirst()
                .orElse(".jpg");
    }

    private String newToken() {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }

    private String hashToken(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException(ex);
        }
    }

    public record LoadedAvatar(Resource resource, String contentType) {
    }
}
