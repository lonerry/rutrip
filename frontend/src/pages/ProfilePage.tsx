import { Camera, Pencil } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth'
import { api } from '../api'
import { UserAvatar } from '../components/UserAvatar'
import { UploadOverlay } from '../components/UploadOverlay'
import type { Place, Region, Story } from '../types'

type ProfileList = 'regions' | 'places' | 'stories'

export function ProfilePage() {
  const { user, logout, applyUser } = useAuth()
  const [params, setParams] = useSearchParams()
  const list = (params.get('list') as ProfileList | null) ?? null
  const [regions, setRegions] = useState<Region[]>([])
  const [storyItems, setStoryItems] = useState<Story[]>([])
  const [placeItems, setPlaceItems] = useState<Place[]>([])
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(user?.displayName ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [listQuery, setListQuery] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const visited = regions.filter((region) => region.visited).length
  const total = regions.length || 89

  useEffect(() => {
    setName(user?.displayName ?? '')
  }, [user?.displayName])

  useEffect(() => {
    Promise.all([api.regions(), api.stories(), api.places()]).then(([nextRegions, nextStories, nextPlaces]) => {
      setRegions(nextRegions)
      setStoryItems(nextStories)
      setPlaceItems(nextPlaces)
    }).catch((err) => setError(err instanceof Error ? err.message : 'Не получилось загрузить профиль'))
  }, [])

  useEffect(() => {
    setListQuery('')
    if (list) listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [list])

  const regionName = (id: string | null) => regions.find((region) => region.id === id)?.name

  const visibleRegions = useMemo(() => {
    const q = listQuery.trim().toLowerCase()
    return regions.filter((region) => region.visited && (!q || region.name.toLowerCase().includes(q)))
  }, [regions, listQuery])

  const visiblePlaces = useMemo(() => {
    const q = listQuery.trim().toLowerCase()
    return placeItems.filter((place) => {
      if (!q) return true
      const region = regionName(place.regionId) ?? ''
      return place.title.toLowerCase().includes(q) || (place.description ?? '').toLowerCase().includes(q) || region.toLowerCase().includes(q)
    })
  }, [placeItems, listQuery, regions])

  const visibleStories = useMemo(() => {
    const q = listQuery.trim().toLowerCase()
    return storyItems.filter((story) => {
      if (!q) return true
      const region = regionName(story.regionId) ?? ''
      return story.title.toLowerCase().includes(q) || story.body.toLowerCase().includes(q) || region.toLowerCase().includes(q)
    })
  }, [storyItems, listQuery, regions])

  function toggleList(next: ProfileList) {
    setParams(list === next ? {} : { list: next }, { replace: true })
  }

  async function saveName() {
    const next = name.trim()
    if (!next || next === user?.displayName) {
      setEditing(false)
      setName(user?.displayName ?? '')
      return
    }
    setBusy(true)
    setError('')
    try {
      applyUser(await api.updateMe({ displayName: next }))
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не получилось сохранить ник')
    } finally {
      setBusy(false)
    }
  }

  async function onPhoto(file?: File) {
    if (!file) return
    setPhotoBusy(true)
    setError('')
    try {
      applyUser(await api.uploadAvatar(file))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не получилось загрузить фото')
    } finally {
      setPhotoBusy(false)
    }
  }

  async function removePhoto() {
    setPhotoBusy(true)
    setError('')
    try {
      applyUser(await api.deleteAvatar())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не получилось удалить фото')
    } finally {
      setPhotoBusy(false)
    }
  }

  if (!user) return null

  return (
    <section className="wrap page" style={{ maxWidth: 720 }}>
      <p className="kicker">Профиль</p>
      <div className="profile-head">
        <button
          className={`profile-avatar${photoBusy ? ' is-uploading' : ''}`}
          type="button"
          disabled={busy || photoBusy}
          onClick={() => fileRef.current?.click()}
          aria-label="Сменить фото"
        >
          <UserAvatar name={user.displayName} avatarUrl={user.avatarUrl} className="profile-avatar-img" />
          <UploadOverlay show={photoBusy} label="Загружаю фото…" compact />
          <span className="profile-avatar-edit">
            <Camera size={14} strokeWidth={2.2} />
            {photoBusy ? '…' : 'фото'}
          </span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            void onPhoto(file)
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          {editing ? (
            <form
              className="profile-name-edit"
              onSubmit={(event) => {
                event.preventDefault()
                void saveName()
              }}
            >
              <input
                className="input"
                value={name}
                maxLength={100}
                autoFocus
                disabled={busy || photoBusy}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    setEditing(false)
                    setName(user.displayName)
                  }
                }}
              />
              <button className="btn" type="submit" disabled={busy || photoBusy || name.trim().length < 2}>
                {busy ? 'Сохраняю…' : 'Сохранить'}
              </button>
            </form>
          ) : (
            <div className="profile-name">
              <h1 style={{ margin: 0 }}>{user.displayName}</h1>
              <button className="btn ghost" type="button" onClick={() => setEditing(true)} aria-label="Сменить ник">
                <Pencil size={16} strokeWidth={2.2} />
              </button>
            </div>
          )}
          <p className="muted">{user.email}</p>
          {user.avatarUrl && (
            <button className="btn ghost" type="button" disabled={busy || photoBusy} onClick={() => void removePhoto()}>
              Убрать фото
            </button>
          )}
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="grid-3 profile-stats">
        <button className={`card stat${list === 'regions' ? ' active' : ''}`} type="button" onClick={() => toggleList('regions')}>
          <b>{visited}</b>регионов
        </button>
        <button className={`card stat${list === 'places' ? ' active' : ''}`} type="button" onClick={() => toggleList('places')}>
          <b>{placeItems.length}</b>точек
        </button>
        <button className={`card stat${list === 'stories' ? ' active' : ''}`} type="button" onClick={() => toggleList('stories')}>
          <b>{storyItems.length}</b>историй
        </button>
        <button className={`card stat${list === 'regions' ? ' active' : ''}`} type="button" onClick={() => toggleList('regions')}>
          <b>{total ? Math.round((visited / total) * 100) : 0}%</b>страны
        </button>
      </div>

      {list && (
        <div className="card profile-list" ref={listRef}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', padding: '10px 10px 6px' }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>
              {list === 'regions' && 'Посещённые регионы'}
              {list === 'places' && 'Точки'}
              {list === 'stories' && 'Истории'}
            </h2>
            <button className="btn ghost" type="button" onClick={() => setParams({}, { replace: true })}>
              Закрыть
            </button>
          </div>
          <input
            className="stories-search"
            placeholder={list === 'regions' ? 'Найти регион…' : list === 'places' ? 'Найти точку…' : 'Найти историю…'}
            value={listQuery}
            onChange={(e) => setListQuery(e.target.value)}
          />
          {list === 'regions' && (
            <div>
              {visibleRegions.map((region) => (
                <div key={region.id} className="list-row">
                  <div className="list-row-text">
                    <strong>{region.name}</strong>
                    <span className="muted">{region.type}</span>
                  </div>
                  <div className="list-row-actions">
                    <Link className="btn ghost" to={`/map?region=${encodeURIComponent(region.code)}`}>
                      На карте
                    </Link>
                  </div>
                </div>
              ))}
              {visibleRegions.length === 0 && (
                <p className="muted" style={{ padding: '8px 12px 12px' }}>
                  {listQuery ? 'Ничего не нашла.' : 'Пока нет отмеченных регионов.'}
                </p>
              )}
            </div>
          )}
          {list === 'places' && (
            <div>
              {visiblePlaces.map((place) => (
                <div key={place.id} className="list-row">
                  <div className="list-row-text">
                    <strong>{place.title}</strong>
                    <span className="muted">
                      {[regionName(place.regionId), place.description].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                  <div className="list-row-actions">
                    <Link className="btn ghost" to={`/map?place=${place.id}`}>
                      На карте
                    </Link>
                  </div>
                </div>
              ))}
              {visiblePlaces.length === 0 && (
                <p className="muted" style={{ padding: '8px 12px 12px' }}>
                  {listQuery ? 'Ничего не нашла.' : 'Пока нет точек.'}
                </p>
              )}
            </div>
          )}
          {list === 'stories' && (
            <div>
              {visibleStories.map((story) => (
                <div key={story.id} className="list-row">
                  <div className="list-row-text">
                    <strong>{story.title}</strong>
                    <span className="muted">
                      {[regionName(story.regionId), story.body.slice(0, 90)].filter(Boolean).join(' · ')}
                      {story.body.length > 90 ? '…' : ''}
                    </span>
                  </div>
                  <div className="list-row-actions">
                    <Link className="btn ghost" to={`/stories?open=${story.id}`}>
                      Открыть
                    </Link>
                  </div>
                </div>
              ))}
              {visibleStories.length === 0 && (
                <p className="muted" style={{ padding: '8px 12px 12px' }}>
                  {listQuery ? 'Ничего не нашла.' : 'Пока нет историй.'}
                </p>
              )}
            </div>
          )}
        </div>
      )}
      <button className="btn light" style={{ marginTop: 28 }} type="button" onClick={logout}>
        Выйти
      </button>
    </section>
  )
}
