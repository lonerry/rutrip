package com.eva.map.friend;

import com.eva.map.auth.AuthService;
import com.eva.map.common.BadRequestException;
import com.eva.map.common.ConflictException;
import com.eva.map.common.ForbiddenException;
import com.eva.map.common.NotFoundException;
import com.eva.map.photo.PhotoRepository;
import com.eva.map.photo.PhotoService;
import com.eva.map.place.PlaceService;
import com.eva.map.place.PlaceResponse;
import com.eva.map.photo.PhotoResponse;
import com.eva.map.region.RegionRepository;
import com.eva.map.region.RegionResponse;
import com.eva.map.story.StoryResponse;
import com.eva.map.story.StoryService;
import com.eva.map.notify.NotificationService;
import com.eva.map.user.User;
import com.eva.map.user.UserRepository;
import com.eva.map.visit.VisitRepository;
import com.eva.map.visit.VisitService;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FriendshipService {

    private final FriendshipRepository friendshipRepository;
    private final UserRepository userRepository;
    private final VisitRepository visitRepository;
    private final VisitService visitService;
    private final RegionRepository regionRepository;
    private final StoryService storyService;
    private final PlaceService placeService;
    private final PhotoService photoService;
    private final PhotoRepository photoRepository;
    private final NotificationService notificationService;

    public FriendshipService(
            FriendshipRepository friendshipRepository,
            UserRepository userRepository,
            VisitRepository visitRepository,
            VisitService visitService,
            RegionRepository regionRepository,
            StoryService storyService,
            PlaceService placeService,
            PhotoService photoService,
            PhotoRepository photoRepository,
            NotificationService notificationService
    ) {
        this.friendshipRepository = friendshipRepository;
        this.userRepository = userRepository;
        this.visitRepository = visitRepository;
        this.visitService = visitService;
        this.regionRepository = regionRepository;
        this.storyService = storyService;
        this.placeService = placeService;
        this.photoService = photoService;
        this.photoRepository = photoRepository;
        this.notificationService = notificationService;
    }

    @Transactional(readOnly = true)
    public boolean areFriends(UUID a, UUID b) {
        if (a.equals(b)) {
            return true;
        }
        return friendshipRepository.findBetween(a, b)
                .filter(friendship -> friendship.getStatus() == FriendshipStatus.ACCEPTED)
                .isPresent();
    }

    @Transactional(readOnly = true)
    public void requireFriendOrSelf(UUID viewerId, UUID ownerId) {
        if (!areFriends(viewerId, ownerId)) {
            throw new ForbiddenException("Карта, фото и истории доступны только друзьям");
        }
    }

    @Transactional(readOnly = true)
    public List<PersonResponse> search(User viewer, String query) {
        String q = query == null ? "" : query.trim();
        return userRepository.search(viewer.getId(), q, PageRequest.of(0, 40)).stream()
                .map(user -> toPerson(viewer.getId(), user, false))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PersonResponse> friends(User viewer) {
        return friendshipRepository.findByUserIdAndStatus(viewer.getId(), FriendshipStatus.ACCEPTED).stream()
                .map(friendship -> toPerson(viewer.getId(), friendship.other(viewer.getId()), true))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PersonResponse> incoming(User viewer) {
        return friendshipRepository.findIncoming(viewer.getId(), FriendshipStatus.PENDING).stream()
                .map(friendship -> toPerson(viewer.getId(), friendship.getRequester(), false))
                .toList();
    }

    @Transactional(readOnly = true)
    public PersonResponse get(User viewer, UUID userId) {
        User target = requireUser(userId);
        boolean counts = areFriends(viewer.getId(), target.getId());
        return toPerson(viewer.getId(), target, counts);
    }

    @Transactional
    public PersonResponse request(User viewer, UUID userId) {
        if (viewer.getId().equals(userId)) {
            throw new BadRequestException("Нельзя добавить себя");
        }
        User target = requireUser(userId);
        var existing = friendshipRepository.findBetween(viewer.getId(), userId);
        if (existing.isPresent()) {
            Friendship friendship = existing.get();
            if (friendship.getStatus() == FriendshipStatus.ACCEPTED) {
                throw new ConflictException("Вы уже друзья");
            }
            if (friendship.getAddressee().getId().equals(viewer.getId())) {
                friendship.setStatus(FriendshipStatus.ACCEPTED);
                notificationService.clearFriendRequest(viewer, friendship.getRequester());
                notificationService.friendAccepted(friendship.getRequester(), viewer);
                return toPerson(viewer.getId(), target, true);
            }
            throw new ConflictException("Заявка уже отправлена");
        }
        Friendship friendship = new Friendship();
        friendship.setRequester(viewer);
        friendship.setAddressee(target);
        friendship.setStatus(FriendshipStatus.PENDING);
        friendshipRepository.save(friendship);
        notificationService.friendRequest(target, viewer);
        return toPerson(viewer.getId(), target, false);
    }

    @Transactional
    public PersonResponse accept(User viewer, UUID userId) {
        Friendship friendship = friendshipRepository.findBetween(viewer.getId(), userId)
                .orElseThrow(() -> new NotFoundException("Заявка не найдена"));
        if (friendship.getStatus() == FriendshipStatus.ACCEPTED) {
            notificationService.clearFriendRequest(viewer, friendship.other(viewer.getId()));
            return toPerson(viewer.getId(), friendship.other(viewer.getId()), true);
        }
        if (!friendship.getAddressee().getId().equals(viewer.getId())) {
            throw new ForbiddenException("Принять заявку может только получатель");
        }
        friendship.setStatus(FriendshipStatus.ACCEPTED);
        notificationService.clearFriendRequest(viewer, friendship.getRequester());
        notificationService.friendAccepted(friendship.getRequester(), viewer);
        return toPerson(viewer.getId(), friendship.getRequester(), true);
    }

    @Transactional
    public void remove(User viewer, UUID userId) {
        Friendship friendship = friendshipRepository.findBetween(viewer.getId(), userId)
                .orElseThrow(() -> new NotFoundException("Заявка не найдена"));
        notificationService.clearFriendRequest(viewer, friendship.other(viewer.getId()));
        notificationService.clearFriendRequest(friendship.other(viewer.getId()), viewer);
        friendshipRepository.delete(friendship);
    }

    @Transactional(readOnly = true)
    public List<RegionResponse> regions(User viewer, UUID userId) {
        requireFriendOrSelf(viewer.getId(), userId);
        Map<UUID, VisitService.VisitMarker> visits = visitService.markersByRegionId(userId);
        return regionRepository.findAllByOrderByNameAsc().stream()
                .map(region -> {
                    VisitService.VisitMarker visit = visits.get(region.getId());
                    return new RegionResponse(
                            region.getId(),
                            region.getCode(),
                            region.getName(),
                            region.getType(),
                            visit != null,
                            visit == null ? null : visit.id(),
                            visit == null ? null : visit.color()
                    );
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public List<StoryResponse> stories(User viewer, UUID userId) {
        requireFriendOrSelf(viewer.getId(), userId);
        return storyService.listFor(userId);
    }

    @Transactional(readOnly = true)
    public List<PlaceResponse> places(User viewer, UUID userId) {
        requireFriendOrSelf(viewer.getId(), userId);
        return placeService.listFor(userId);
    }

    @Transactional(readOnly = true)
    public List<PhotoResponse> photos(User viewer, UUID userId) {
        requireFriendOrSelf(viewer.getId(), userId);
        return photoService.listFor(userId);
    }

    private User requireUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Пользователь не найден"));
    }

    private PersonResponse toPerson(UUID viewerId, User user, boolean withCounts) {
        String relation = relationOf(viewerId, user.getId());
        boolean showCounts = withCounts || "friends".equals(relation) || "self".equals(relation);
        return new PersonResponse(
                user.getId(),
                user.getDisplayName(),
                AuthService.avatarUrl(user),
                AuthService.mapColor(user),
                relation,
                showCounts ? visitRepository.countByUserId(user.getId()) : 0,
                showCounts ? storyService.countFor(user.getId()) : 0,
                showCounts ? photoRepository.countByUserId(user.getId()) : 0
        );
    }

    private String relationOf(UUID viewerId, UUID userId) {
        if (viewerId.equals(userId)) {
            return "self";
        }
        return friendshipRepository.findBetween(viewerId, userId)
                .map(friendship -> {
                    if (friendship.getStatus() == FriendshipStatus.ACCEPTED) {
                        return "friends";
                    }
                    return friendship.getRequester().getId().equals(viewerId) ? "outgoing" : "incoming";
                })
                .orElse("none");
    }
}
