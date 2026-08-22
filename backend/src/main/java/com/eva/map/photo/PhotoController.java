package com.eva.map.photo;

import com.eva.map.user.User;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/photos")
public class PhotoController {

    private final PhotoService photoService;

    public PhotoController(PhotoService photoService) {
        this.photoService = photoService;
    }

    @GetMapping
    public List<PhotoResponse> list(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) UUID storyId
    ) {
        return photoService.list(user, storyId);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public List<PhotoResponse> upload(
            @AuthenticationPrincipal User user,
            @RequestParam(value = "files", required = false) List<MultipartFile> files,
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam(required = false) UUID storyId,
            @RequestParam(required = false) UUID placeId,
            @RequestParam(required = false) UUID visitId
    ) {
        List<MultipartFile> all = files == null ? new ArrayList<>() : new ArrayList<>(files);
        if (file != null) {
            all.add(file);
        }
        return photoService.uploadMany(user, all, storyId, placeId, visitId);
    }

    @GetMapping("/{id}")
    public ResponseEntity<org.springframework.core.io.Resource> get(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id
    ) {
        PhotoService.LoadedPhoto photo = photoService.load(user, id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, photo.contentType())
                .body(photo.resource());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        photoService.delete(user, id);
    }
}
