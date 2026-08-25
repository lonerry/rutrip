import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { AuthMedia } from '../components/AuthPhoto'
import { MediaGallery } from '../components/MediaLightbox'
import { UserAvatar } from '../components/UserAvatar'
import type { Person, Photo, Place, Region, Story } from '../types'

function photosForRegion(region: Region, photos: Photo[], stories: Story[], places: Place[]) {
  const storyIds = new Set(stories.filter((story) => story.regionId === region.id).map((story) => story.id))
  const placeIds = new Set(places.filter((place) => place.regionId === region.id).map((place) => place.id))
  return photos.filter(
    (photo) =>
      photo.regionId === region.id ||
      (photo.storyId && storyIds.has(photo.storyId)) ||
      (photo.placeId && placeIds.has(photo.placeId)) ||
      (photo.visitId !== null && photo.visitId === region.visitId),
  )
}

export function FriendPage() {
  const { userId } = useParams()
  const [params, setParams] = useSearchParams()
  const [person, setPerson] = useState<Person>()
  const [stories, setStories] = useState<Story[]>([])
  const [photos, setPhotos] = useState<Photo[]>([])
  const [regions, setRegions] = useState<Region[]>([])
  const [places, setPlaces] = useState<Place[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const storiesRef = useRef<HTMLDivElement>(null)
  const mediaRef = useRef<HTMLDivElement>(null)

  async function reload() {
    if (!userId) return
    const nextPerson = await api.person(userId)
    setPerson(nextPerson)
    if (nextPerson.relation === 'friends' || nextPerson.relation === 'self') {
      const [nextStories, nextPhotos, nextRegions, nextPlaces] = await Promise.all([
        api.personStories(userId),
        api.personPhotos(userId),
        api.personRegions(userId),
        api.personPlaces(userId),
      ])
      setStories(nextStories)
      setPhotos(nextPhotos)
      setRegions(nextRegions)
      setPlaces(nextPlaces)
    } else {
      setStories([])
      setPhotos([])
      setRegions([])
      setPlaces([])
    }
  }

  useEffect(() => {
    reload().catch((err) => setError(err instanceof Error ? err.message : 'Ошибка загрузки'))
  }, [userId])

  const photosByStory = useMemo(() => {
    const map = new Map<string, Photo[]>()
    for (const photo of photos) {
      if (!photo.storyId) continue
      const list = map.get(photo.storyId) ?? []
      list.push(photo)
      map.set(photo.storyId, list)
    }
    return map
  }, [photos])

  const gallery = useMemo(() => {
    const used = new Set<string>()
    const sections: { id: string; title: string; photos: Photo[] }[] = []
    for (const region of regions.filter((item) => item.visited)) {
      const list = photosForRegion(region, photos, stories, places)
      if (list.length === 0) continue
      list.forEach((photo) => used.add(photo.id))
      sections.push({ id: region.id, title: region.name, photos: list })
    }
    const rest = photos.filter((photo) => !used.has(photo.id))
    if (rest.length > 0) sections.push({ id: 'other', title: 'Без региона', photos: rest })
    return sections
  }, [regions, photos, stories, places])

  const regionName = (id: string | null) => regions.find((region) => region.id === id)?.name

  async function act(action: () => Promise<unknown>) {
    setBusy(true)
    setError('')
    try {
      await action()
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не получилось')
    } finally {
      setBusy(false)
    }
  }

  if (!person) {
    return (
      <section className="wrap page">
        {error ? <p className="error">{error}</p> : <p className="muted">Загрузка…</p>}
      </section>
    )
  }

  const canSee = person.relation === 'friends' || person.relation === 'self'
  const openId = params.get('open') ?? undefined
  const open = stories.find((story) => story.id === openId)

  function openStory(id: string) {
    setParams({ open: id }, { replace: true })
  }

  function closeStory() {
    setParams({}, { replace: true })
  }

  return (
    <section className="wrap page">
      <p className="kicker">Профиль</p>
      <div className="friend-head">
        <div className="friend-head-main">
          <UserAvatar name={person.displayName} avatarUrl={person.avatarUrl} className="profile-avatar-img friend-avatar" />
          <div className="friend-head-text">
            <h1>{person.displayName}</h1>
            <p className="muted">
              {person.relation === 'self'
                ? 'Это ты'
                : person.relation === 'friends'
                  ? 'Ваш друг'
                  : 'Добавь в друзья, чтобы видеть карту и истории'}
            </p>
          </div>
        </div>
        <div className="friend-head-actions">
          {canSee && (
            <Link className="btn teal" to={person.relation === 'self' ? '/map' : `/map/${person.id}`}>
              Карта
            </Link>
          )}
          {person.relation === 'none' && (
            <button className="btn teal" type="button" disabled={busy} onClick={() => act(() => api.requestFriend(person.id))}>
              Добавить в друзья
            </button>
          )}
          {person.relation === 'outgoing' && (
            <button className="btn light" type="button" disabled={busy} onClick={() => act(() => api.removeFriend(person.id))}>
              Отменить заявку
            </button>
          )}
          {person.relation === 'incoming' && (
            <button className="btn teal" type="button" disabled={busy} onClick={() => act(() => api.acceptFriend(person.id))}>
              Принять заявку
            </button>
          )}
          {person.relation === 'friends' && (
            <button className="btn ghost" type="button" disabled={busy} onClick={() => act(() => api.removeFriend(person.id))}>
              Удалить из друзей
            </button>
          )}
        </div>
      </div>
      {error && <p className="error">{error}</p>}

      {canSee && (
        <>
          <div className="grid-3" style={{ marginTop: 28 }}>
            <Link className="card stat" to={person.relation === 'self' ? '/map' : `/map/${person.id}`}>
              <b>{person.visitedCount}</b>регионов
            </Link>
            <button className="card stat" type="button" onClick={() => storiesRef.current?.scrollIntoView({ behavior: 'smooth' })}>
              <b>{person.storyCount}</b>историй
            </button>
            <button className="card stat" type="button" onClick={() => mediaRef.current?.scrollIntoView({ behavior: 'smooth' })}>
              <b>{photos.length || person.photoCount}</b>медиа
            </button>
          </div>

          <div ref={storiesRef}>
            <h2 style={{ marginTop: 36 }}>Истории</h2>
            <div className="story-grid">
              {stories.map((story) => {
                const cover = photosByStory.get(story.id)?.[0]
                return (
                  <article
                    key={story.id}
                    className={`story-card${openId === story.id ? ' open' : ''}`}
                    onClick={() => openStory(story.id)}
                  >
                    <div className={`cover${cover ? '' : ' story-cover-empty'}`}>
                      {cover && (
                        <AuthMedia
                          id={cover.id}
                          alt={story.title}
                          contentType={cover.contentType}
                          className="cover"
                          controls={false}
                        />
                      )}
                    </div>
                    <div className="story-card-body">
                      <p className="kicker">{regionName(story.regionId) ?? 'Без региона'}</p>
                      <h3>{story.title}</h3>
                      <p className="muted">
                        {story.body.slice(0, 140)}
                        {story.body.length > 140 ? '…' : ''}
                      </p>
                      <span className="story-read">Читать</span>
                    </div>
                  </article>
                )
              })}
              {stories.length === 0 && <p className="muted">Историй пока нет.</p>}
            </div>
          </div>

          <div ref={mediaRef} className="friend-gallery">
            <h2 style={{ marginTop: 36 }}>Медиа</h2>
            {gallery.length === 0 ? (
              <p className="muted">Пока нет фото и видео.</p>
            ) : (
              gallery.map((section) => (
                <section key={section.id} className="friend-gallery-section">
                  <h3>{section.title}</h3>
                  <p className="muted">{section.photos.length} фото и видео</p>
                  <MediaGallery photos={section.photos} alt={section.title} />
                </section>
              ))
            )}
          </div>
        </>
      )}
      {open && (
        <div className="story-modal" onClick={closeStory}>
          <article className="card story-reader" onClick={(event) => event.stopPropagation()}>
            <div className="story-reader-top">
              <div>
                <p className="kicker">{regionName(open.regionId) ?? 'История'}</p>
                <h2 style={{ marginTop: 4 }}>{open.title}</h2>
              </div>
              <button className="btn ghost" type="button" onClick={closeStory} aria-label="Закрыть">
                ✕
              </button>
            </div>
            <p className="story-reader-body">{open.body}</p>
            <MediaGallery photos={photosByStory.get(open.id) ?? []} alt={open.title} />
          </article>
        </div>
      )}
    </section>
  )
}
