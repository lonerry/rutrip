import { useMemo, useState, type FormEvent } from 'react'
import { api } from '../api'
import type { Photo, Place, Region, Story } from '../types'
import { AuthMedia } from './AuthPhoto'
import { MapColorPicker } from './MapColorPicker'
import { MediaAttach } from './MediaAttach'
import { normalizeMapColor } from '../mapColor'

const typeLabel: Record<string, string> = {
  republic: 'Республика',
  krai: 'Край',
  oblast: 'Область',
  federal_city: 'Город федерального значения',
  autonomous_oblast: 'Автономная область',
  autonomous_okrug: 'Автономный округ',
}

export function RegionSheet({
  region,
  stories,
  photos,
  places,
  error,
  onClose,
  onReload,
  onAddPlace,
  readOnly = false,
}: {
  region: Region
  stories: Story[]
  photos: Photo[]
  places: Place[]
  error: string
  onClose: () => void
  onReload: () => Promise<void>
  onAddPlace: () => void
  readOnly?: boolean
}) {
  const [tab, setTab] = useState<'photos' | 'stories' | 'places'>('photos')
  const [busy, setBusy] = useState(false)
  const [localError, setLocalError] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [storyFiles, setStoryFiles] = useState<File[]>([])
  const [writing, setWriting] = useState(false)

  const regionStories = useMemo(
    () => stories.filter((story) => story.regionId === region.id),
    [stories, region.id],
  )
  const regionPlaces = useMemo(
    () => places.filter((place) => place.regionId === region.id),
    [places, region.id],
  )
  const regionPhotos = useMemo(() => {
    const storyIds = new Set(regionStories.map((story) => story.id))
    const placeIds = new Set(regionPlaces.map((place) => place.id))
    return photos.filter(
      (photo) =>
        photo.regionId === region.id ||
        (photo.storyId && storyIds.has(photo.storyId)) ||
        (photo.placeId && placeIds.has(photo.placeId)) ||
        (photo.visitId && photo.visitId === region.visitId),
    )
  }, [photos, region, regionStories, regionPlaces])

  async function saveColor(color: string) {
    setLocalError('')
    setBusy(true)
    try {
      if (region.visitId) await api.updateVisitColor(region.visitId, color)
      else await api.createVisit(region.code, { color })
      await onReload()
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Не получилось сменить цвет')
    } finally {
      setBusy(false)
    }
  }

  async function toggleVisit() {
    setLocalError('')
    setBusy(true)
    try {
      if (region.visited && region.visitId) await api.deleteVisit(region.visitId)
      else await api.createVisit(region.code)
      await onReload()
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Не получилось обновить регион')
    } finally {
      setBusy(false)
    }
  }

  async function ensureVisit() {
    if (region.visitId) return region.visitId
    const visit = await api.createVisit(region.code)
    return visit.id
  }

  async function uploadPhoto(event: FormEvent) {
    event.preventDefault()
    if (photoFiles.length === 0) return
    setBusy(true)
    setLocalError('')
    try {
      const visitId = await ensureVisit()
      await api.uploadMedia(photoFiles, { visitId })
      setPhotoFiles([])
      await onReload()
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Не получилось загрузить фото')
    } finally {
      setBusy(false)
    }
  }

  async function createStory(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setLocalError('')
    try {
      await ensureVisit()
      const story = await api.createStory({ title, body, regionId: region.id })
      if (storyFiles.length > 0) await api.uploadMedia(storyFiles, { storyId: story.id })
      setTitle('')
      setBody('')
      setStoryFiles([])
      await onReload()
      setTab('stories')
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Не получилось сохранить историю')
    } finally {
      setBusy(false)
    }
  }

  async function removePlace(id: string) {
    setBusy(true)
    setLocalError('')
    try {
      await api.deletePlace(id)
      await onReload()
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Не получилось удалить точку')
    } finally {
      setBusy(false)
    }
  }

  const message = localError || error

  return (
    <aside className="sheet">
      <div className="sheet-head">
        <div>
          <p className="kicker">{typeLabel[region.type] ?? region.type}</p>
          <h2 style={{ margin: '6px 0 0' }}>{region.name}</h2>
        </div>
        <button className="btn ghost" type="button" onClick={onClose} aria-label="Закрыть">
          ✕
        </button>
      </div>

      <div className="sheet-meta">
        {readOnly ? (
          <p className="muted" style={{ margin: 0 }}>
            {region.visited ? 'Друг был здесь' : 'Ещё не отмечен'}
          </p>
        ) : (
          <button className={`btn full ${region.visited ? 'light' : 'teal'}`} type="button" disabled={busy} onClick={toggleVisit}>
            {region.visited ? 'Снять отметку' : 'Я здесь была'}
          </button>
        )}
        {region.visited && (
          <div style={{ marginTop: 12 }}>
            <p className="muted" style={{ margin: '0 0 6px', fontSize: 12 }}>Цвет на карте</p>
            <MapColorPicker
              value={normalizeMapColor(region.color)}
              disabled={busy || readOnly}
              onChange={(color) => void saveColor(color)}
            />
          </div>
        )}
        <div className="counts">
          <div>
            <b>{regionPhotos.length}</b>медиа
          </div>
          <div>
            <b>{regionStories.length}</b>историй
          </div>
          <div>
            <b>{regionPlaces.length}</b>точек
          </div>
        </div>
      </div>

      <div className="tabs">
        <button className={tab === 'photos' ? 'active' : ''} type="button" onClick={() => setTab('photos')}>
          Медиа
        </button>
        <button className={tab === 'stories' ? 'active' : ''} type="button" onClick={() => setTab('stories')}>
          Истории
        </button>
        <button className={tab === 'places' ? 'active' : ''} type="button" onClick={() => setTab('places')}>
          Точки
        </button>
      </div>

      {message && <p className="error" style={{ padding: '12px 20px 0' }}>{message}</p>}

      <div className="sheet-body">
        {tab === 'photos' && (
          <>
            {!readOnly && (
              <form onSubmit={uploadPhoto}>
                <MediaAttach
                  files={photoFiles}
                  onChange={setPhotoFiles}
                  emptyLabel="+ Добавить фото и видео"
                />
                {photoFiles.length > 0 && (
                  <button className="btn full" style={{ marginTop: 10 }} disabled={busy} type="submit">
                    Загрузить {photoFiles.length}
                  </button>
                )}
              </form>
            )}
            {regionPhotos.length === 0 ? (
              <p className="muted">{readOnly ? 'Пока нет фото и видео.' : 'Пока нет фото и видео. Загрузи первые воспоминания.'}</p>
            ) : (
              <div className="photos" style={{ marginTop: 12 }}>
                {regionPhotos.map((photo) => (
                  <AuthMedia
                    key={photo.id}
                    id={photo.id}
                    alt={region.name}
                    contentType={photo.contentType}
                    className="cover"
                  />
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'stories' && (
          <>
            {!readOnly && !writing && (
              <button className="btn full light" type="button" onClick={() => setWriting(true)}>
                Написать историю
              </button>
            )}
            {!readOnly && writing && (
            <form className="sheet-form" onSubmit={createStory}>
              <input className="input" placeholder="Заголовок" value={title} onChange={(e) => setTitle(e.target.value)} required />
              <textarea className="area" rows={3} placeholder="Что здесь произошло?" value={body} onChange={(e) => setBody(e.target.value)} required />
              <MediaAttach
                files={storyFiles}
                onChange={setStoryFiles}
                emptyLabel="Фото или видео"
              />
              <div className="sheet-form-actions">
                <button className="btn teal" disabled={busy} type="submit">
                  Сохранить
                </button>
                <button
                  className="btn ghost"
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setWriting(false)
                    setStoryFiles([])
                  }}
                >
                  Отмена
                </button>
              </div>
            </form>
            )}
            {regionStories.length === 0 ? (
              <p className="muted">{readOnly ? 'Историй ещё нет.' : 'Историй ещё нет — напиши первую.'}</p>
            ) : (
              regionStories.map((story) => (
                <article key={story.id} className="story-item">
                  <h3 style={{ margin: 0 }}>{story.title}</h3>
                  <p className="muted">{story.body}</p>
                </article>
              ))
            )}
          </>
        )}

        {tab === 'places' && (
          <>
            {!readOnly && (
            <button className="btn full light" type="button" onClick={onAddPlace}>
              Поставить точку на карте
            </button>
            )}
            {regionPlaces.length === 0 ? (
              <p className="muted">{readOnly ? 'Точек нет.' : 'Точек нет. Нажми кнопку, затем кликни место на карте.'}</p>
            ) : (
              regionPlaces.map((place) => (
                <article key={place.id} className="story-item">
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ margin: 0 }}>{place.title}</h3>
                      {place.description && <p className="muted" style={{ margin: '6px 0 0' }}>{place.description}</p>}
                    </div>
                    {!readOnly && (
                    <button
                      className="btn ghost"
                      type="button"
                      disabled={busy}
                      onClick={() => removePlace(place.id)}
                    >
                      Удалить
                    </button>
                    )}
                  </div>
                </article>
              ))
            )}
          </>
        )}
      </div>
    </aside>
  )
}
