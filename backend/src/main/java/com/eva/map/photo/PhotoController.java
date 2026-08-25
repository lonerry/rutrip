package com.eva.map.photo;

import com.eva.map.user.User;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.ResourceRegion;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpRange;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
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
    public ResponseEntity<ResourceRegion> get(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id,
            @RequestHeader HttpHeaders headers
    ) throws IOException {
        PhotoService.LoadedPhoto photo = photoService.load(user, id);
        Resource resource = photo.resource();
        long length = resource.contentLength();
        MediaType mediaType = MediaType.parseMediaType(photo.contentType());
        List<HttpRange> ranges = headers.getRange();

        ResourceRegion region;
        HttpStatus status;
        if (ranges.isEmpty()) {
            region = new ResourceRegion(resource, 0, length);
            status = HttpStatus.OK;
        } else {
            region = ranges.getFirst().toResourceRegion(resource);
            status = HttpStatus.PARTIAL_CONTENT;
        }

        return ResponseEntity.status(status)
                .contentType(mediaType)
                .header(HttpHeaders.ACCEPT_RANGES, "bytes")
                .header(HttpHeaders.CACHE_CONTROL, "private, max-age=3600")
                .body(region);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        photoService.delete(user, id);
    }
}
