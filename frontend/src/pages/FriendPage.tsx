import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import { AuthMedia } from '../components/AuthPhoto'
import { UserAvatar } from '../components/UserAvatar'
import type { Person, Photo, Story } from '../types'

export function FriendPage() {
  const { userId } = useParams()
  const [person, setPerson] = useState<Person>()
  const [stories, setStories] = useState<Story[]>([])
  const [photos, setPhotos] = useState<Photo[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function reload() {
    if (!userId) return
    const nextPerson = await api.person(userId)
    setPerson(nextPerson)
    if (nextPerson.relation === 'friends' || nextPerson.relation === 'self') {
      const [nextStories, nextPhotos] = await Promise.all([
        api.personStories(userId),
        api.personPhotos(userId),
      ])
      setStories(nextStories)
      setPhotos(nextPhotos)
    } else {
      setStories([])
      setPhotos([])
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
            <div className="card stat">
              <b>{person.visitedCount}</b>регионов
            </div>
            <div className="card stat">
              <b>{person.storyCount}</b>историй
            </div>
            <div className="card stat">
              <b>{person.photoCount}</b>медиа
            </div>
          </div>

          <h2 style={{ marginTop: 36 }}>Истории</h2>
          <div className="story-grid">
            {stories.map((story) => {
              const cover = photosByStory.get(story.id)?.[0]
              return (
                <article key={story.id} className="story-card">
                  <div className="cover">
                    {cover ? (
                      <AuthMedia
                        id={cover.id}
                        alt={story.title}
                        contentType={cover.contentType}
                        className="cover"
                      />
                    ) : null}
                  </div>
                  <div style={{ padding: 16 }}>
                    <h3 style={{ margin: '4px 0' }}>{story.title}</h3>
                    <p className="muted">
                      {story.body.slice(0, 140)}
                      {story.body.length > 140 ? '…' : ''}
                    </p>
                  </div>
                </article>
              )
            })}
            {stories.length === 0 && <p className="muted">Историй пока нет.</p>}
          </div>
        </>
      )}
    </section>
  )
}
