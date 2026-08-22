package com.eva.map.photo;

import com.eva.map.common.BadRequestException;
import com.eva.map.common.ForbiddenException;
import com.eva.map.common.NotFoundException;
import com.eva.map.friend.FriendshipRepository;
import com.eva.map.friend.FriendshipStatus;
import com.eva.map.place.PlaceRepository;
import com.eva.map.story.StoryRepository;
import com.eva.map.user.User;
import com.eva.map.visit.VisitRepository;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class PhotoService {

    private static final Map<String, String> EXTENSION_TYPES = Map.ofEntries(
            Map.entry(".jpg", MediaType.IMAGE_JPEG_VALUE),
            Map.entry(".jpeg", MediaType.IMAGE_JPEG_VALUE),
            Map.entry(".png", MediaType.IMAGE_PNG_VALUE),
            Map.entry(".webp", "image/webp"),
            Map.entry(".gif", MediaType.IMAGE_GIF_VALUE),
            Map.entry(".mp4", "video/mp4"),
            Map.entry(".webm", "video/webm"),
            Map.entry(".mov", "video/quicktime")
    );

    private static final Set<String> ALLOWED_TYPES = Set.copyOf(EXTENSION_TYPES.values());

    private final PhotoRepository photoRepository;
    private final StoryRepository storyRepository;
    private final PlaceRepository placeRepository;
    private final VisitRepository visitRepository;
    private final FriendshipRepository friendshipRepository;
    private final Path uploadDir;

    public PhotoService(
            PhotoRepository photoRepository,
            StoryRepository storyRepository,
            PlaceRepository placeRepository,
            VisitRepository visitRepository,
            FriendshipRepository friendshipRepository,
            @Value("${app.upload.dir}") String uploadDir
    ) throws IOException {
        this.photoRepository = photoRepository;
        this.storyRepository = storyRepository;
        this.placeRepository = placeRepository;
        this.visitRepository = visitRepository;
        this.friendshipRepository = friendshipRepository;
        this.uploadDir = Path.of(uploadDir).toAbsolutePath().normalize();
        Files.createDirectories(this.uploadDir);
    }

    @Transactional(readOnly = true)
    public List<PhotoResponse> list(User user, UUID storyId) {
        if (storyId != null) {
            return photoRepository.findAllByUserIdAndStoryId(user.getId(), storyId).stream()
                    .map(this::toResponse)
                    .toList();
        }
        return listFor(user.getId());
    }

    @Transactional(readOnly = true)
    public List<PhotoResponse> listFor(UUID userId) {
        return photoRepository.findAllByUserId(userId).stream().map(this::toResponse).toList();
    }

    @Transactional
    public List<PhotoResponse> uploadMany(
            User user,
            List<MultipartFile> files,
            UUID storyId,
            UUID placeId,
            UUID visitId
    ) {
        if (files == null || files.isEmpty() || files.stream().allMatch(file -> file == null || file.isEmpty())) {
            throw new BadRequestException("Files are required");
        }
        List<PhotoResponse> saved = new ArrayList<>();
        for (MultipartFile file : files) {
            if (file != null && !file.isEmpty()) {
                saved.add(upload(user, file, storyId, placeId, visitId));
            }
        }
        if (saved.isEmpty()) {
            throw new BadRequestException("Files are required");
        }
        return saved;
    }

    @Transactional
    public PhotoResponse upload(User user, MultipartFile file, UUID storyId, UUID placeId, UUID visitId) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("File is required");
        }
        String originalName = file.getOriginalFilename() == null ? "" : file.getOriginalFilename();
        String extension = extensionOf(originalName);
        String contentType = resolveContentType(file.getContentType(), extension);
        if (!ALLOWED_TYPES.contains(contentType)) {
            throw new BadRequestException("Можно загружать фото (JPEG, PNG, WebP, GIF) и видео (MP4, WebM, MOV)");
        }

        String filename = UUID.randomUUID() + (extension.isEmpty() ? extensionFor(contentType) : extension);
        Path target = uploadDir.resolve(filename);

        try (InputStream input = file.getInputStream()) {
            Files.copy(input, target);
        } catch (IOException ex) {
            throw new IllegalStateException("Could not store file", ex);
        }

        Photo photo = new Photo();
        photo.setUser(user);
        photo.setFilePath(filename);
        photo.setContentType(contentType);
        if (storyId != null) {
            photo.setStory(storyRepository.findByIdAndUserId(storyId, user.getId())
                    .orElseThrow(() -> new NotFoundException("Story not found")));
        }
        if (placeId != null) {
            photo.setPlace(placeRepository.findByIdAndUserId(placeId, user.getId())
                    .orElseThrow(() -> new NotFoundException("Place not found")));
        }
        if (visitId != null) {
            photo.setVisit(visitRepository.findByIdAndUserId(visitId, user.getId())
                    .orElseThrow(() -> new NotFoundException("Visit not found")));
        }
        photoRepository.save(photo);
        return toResponse(photo);
    }

    @Transactional(readOnly = true)
    public LoadedPhoto load(User user, UUID id) {
        Photo photo = photoRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Photo not found"));
        UUID ownerId = photo.getUser().getId();
        if (!ownerId.equals(user.getId()) && !areFriends(user.getId(), ownerId)) {
            throw new ForbiddenException("Фото доступно только друзьям");
        }
        Path path = uploadDir.resolve(photo.getFilePath()).normalize();
        if (!path.startsWith(uploadDir) || !Files.exists(path)) {
            throw new NotFoundException("Photo file not found");
        }
        return new LoadedPhoto(new FileSystemResource(path), photo.getContentType());
    }

    @Transactional
    public void delete(User user, UUID id) {
        Photo photo = requireOwned(user, id);
        Path path = uploadDir.resolve(photo.getFilePath()).normalize();
        photoRepository.delete(photo);
        try {
            if (path.startsWith(uploadDir)) {
                Files.deleteIfExists(path);
            }
        } catch (IOException ignored) {
            // metadata is already gone; leftover file is cleaned up later
        }
    }

    private String resolveContentType(String reported, String extension) {
        if (reported != null && ALLOWED_TYPES.contains(reported)) {
            return reported;
        }
        String fromName = EXTENSION_TYPES.get(extension);
        if (fromName != null) {
            return fromName;
        }
        return reported == null ? "" : reported;
    }

    private String extensionOf(String filename) {
        int dot = filename.lastIndexOf('.');
        if (dot < 0) {
            return "";
        }
        return filename.substring(dot).toLowerCase(Locale.ROOT);
    }

    private String extensionFor(String contentType) {
        return EXTENSION_TYPES.entrySet().stream()
                .filter(entry -> entry.getValue().equals(contentType))
                .map(Map.Entry::getKey)
                .findFirst()
                .orElse("");
    }

    private Photo requireOwned(User user, UUID id) {
        return photoRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new NotFoundException("Photo not found"));
    }

    private boolean areFriends(UUID a, UUID b) {
        return friendshipRepository.findBetween(a, b)
                .filter(friendship -> friendship.getStatus() == FriendshipStatus.ACCEPTED)
                .isPresent();
    }

    private PhotoResponse toResponse(Photo photo) {
        return new PhotoResponse(
                photo.getId(),
                "/api/photos/" + photo.getId(),
                photo.getContentType(),
                photo.getStory() == null ? null : photo.getStory().getId(),
                photo.getPlace() == null ? null : photo.getPlace().getId(),
                photo.getVisit() == null ? null : photo.getVisit().getId(),
                resolveRegionId(photo),
                photo.getCreatedAt()
        );
    }

    private UUID resolveRegionId(Photo photo) {
        if (photo.getStory() != null && photo.getStory().getRegion() != null) {
            return photo.getStory().getRegion().getId();
        }
        if (photo.getPlace() != null && photo.getPlace().getRegion() != null) {
            return photo.getPlace().getRegion().getId();
        }
        if (photo.getVisit() != null && photo.getVisit().getRegion() != null) {
            return photo.getVisit().getRegion().getId();
        }
        return null;
    }

    public record LoadedPhoto(Resource resource, String contentType) {
    }
}
