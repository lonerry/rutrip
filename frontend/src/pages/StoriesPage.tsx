import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { AuthMedia } from '../components/AuthPhoto'
import { MediaAttach } from '../components/MediaAttach'
import { MediaGallery } from '../components/MediaLightbox'
import type { Photo, Region, Story } from '../types'

export function StoriesPage() {
  const [stories, setStories] = useState<Story[]>([])
  const [photos, setPhotos] = useState<Photo[]>([])
  const [regions, setRegions] = useState<Region[]>([])
  const [error, setError] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [regionId, setRegionId] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [openId, setOpenId] = useState<string>()
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editBody, setEditBody] = useState('')
  const [editRegionId, setEditRegionId] = useState('')
  const [editFiles, setEditFiles] = useState<File[]>([])
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [published, setPublished] = useState(false)
  const [ready, setReady] = useState(false)
  const [params, setParams] = useSearchParams()

  async function reload() {
    const [nextStories, nextPhotos, nextRegions] = await Promise.all([
      api.stories(),
      api.photos(),
      api.regions(),
    ])
    setStories(nextStories)
    setPhotos(nextPhotos)
    setRegions(nextRegions)
    setReady(true)
  }

  useEffect(() => {
    reload().catch((err) => setError(err instanceof Error ? err.message : 'Ошибка загрузки'))
  }, [])

  useEffect(() => {
    const id = params.get('open')
    if (id) setOpenId(id)
  }, [params])

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

  const regionName = (id: string | null) => regions.find((region) => region.id === id)?.name

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return stories
    return stories.filter((story) => {
      const region = regionName(story.regionId) ?? ''
      return (
        story.title.toLowerCase().includes(q) ||
        story.body.toLowerCase().includes(q) ||
        region.toLowerCase().includes(q)
      )
    })
  }, [stories, query, regions])

  async function onCreate(event: FormEvent) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const story = await api.createStory({
        title,
        body,
        regionId: regionId || undefined,
      })
      if (files.length > 0) await api.uploadMedia(files, { storyId: story.id })
      setTitle('')
      setBody('')
      setRegionId('')
      setFiles([])
      setPublished(true)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не получилось сохранить историю')
    } finally {
      setBusy(false)
    }
  }

  const open = stories.find((story) => story.id === openId)

  function closeStory() {
    setEditing(false)
    setEditFiles([])
    setOpenId(undefined)
    setParams({}, { replace: true })
  }

  function openStory(id: string) {
    setEditing(false)
    setEditFiles([])
    setOpenId(id)
    setParams({ open: id }, { replace: true })
  }

  function startEdit() {
    if (!open) return
    setEditTitle(open.title)
    setEditBody(open.body)
    setEditRegionId(open.regionId ?? '')
    setEditFiles([])
    setEditing(true)
  }

  async function saveEdit(event: FormEvent) {
    event.preventDefault()
    if (!open) return
    setError('')
    setBusy(true)
    try {
      await api.updateStory(open.id, {
        title: editTitle,
        body: editBody,
        regionId: editRegionId || undefined,
      })
      if (editFiles.length > 0) await api.uploadMedia(editFiles, { storyId: open.id })
      setEditFiles([])
      setEditing(false)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не получилось сохранить изменения')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (editing) {
        setEditing(false)
        setEditFiles([])
      } else {
        closeStory()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, editing])

  return (
    <section className="wrap page">
      <p className="kicker">Дневник</p>
      <h1>Истории поездок</h1>
      <p className="lead" style={{ marginTop: 0 }}>Короткие записи, фото и регион, где это было.</p>
      {error && <p className="error">{error}</p>}

      <div className="stories-layout">
        <form onSubmit={onCreate} className="card story-compose">
          <h2>Новая история</h2>
          <label className="field">
            Заголовок
            <input className="input" placeholder="Например, рассвет на Каме" value={title} onChange={(e) => { setPublished(false); setTitle(e.target.value) }} required />
          </label>
          <label className="field">
            Текст
            <textarea className="area" rows={6} placeholder="Что запомнилось" value={body} onChange={(e) => { setPublished(false); setBody(e.target.value) }} required />
          </label>
          <label className="field">
            Регион
            <select className="input" value={regionId} onChange={(e) => { setPublished(false); setRegionId(e.target.value) }}>
              <option value="">Без региона</option>
              {regions.map((region) => (
                <option key={region.id} value={region.id}>{region.name}</option>
              ))}
            </select>
          </label>
          <MediaAttach
            files={files}
            onChange={(next) => { setPublished(false); setFiles(next) }}
            uploading={busy && !editing}
            uploadingLabel={files.length > 0 ? 'Загружаю фото…' : 'Публикую…'}
          />
          <button className="btn full" style={{ marginTop: 14 }} type="submit" disabled={busy || published}>
            {busy ? 'Публикую…' : published ? 'Опубликовано' : 'Опубликовать'}
          </button>
        </form>

        <div>
          <input
            className="stories-search"
            placeholder="Найти историю, регион, слово…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="story-grid">
            {filtered.map((story) => {
              const cover = photosByStory.get(story.id)?.[0]
              return (
                <article
                  key={story.id}
                  className={`story-card${openId === story.id ? ' open' : ''}`}
                  tabIndex={0}
                  role="button"
                  onClick={() => openStory(story.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      openStory(story.id)
                    }
                  }}
                >
                  <div className={`cover${cover ? '' : ' story-cover-empty'}`}>
                    {cover ? (
                      <AuthMedia
                        id={cover.id}
                        alt={story.title}
                        contentType={cover.contentType}
                        className="cover"
                      />
                    ) : null}
                  </div>
                  <div className="story-card-body">
                    <p className="kicker">{regionName(story.regionId) ?? 'Без региона'}</p>
                    <h3>{story.title}</h3>
                    <p className="muted">{story.body.slice(0, 140)}{story.body.length > 140 ? '…' : ''}</p>
                    <span className="story-read">Читать →</span>
                  </div>
                </article>
              )
            })}
          </div>
          {stories.length === 0 && <p className="muted" style={{ marginTop: 16 }}>{ready ? 'Пока нет ни одной истории.' : 'Загрузка…'}</p>}
          {stories.length > 0 && filtered.length === 0 && (
            <p className="muted" style={{ marginTop: 16 }}>Ничего не нашла по запросу.</p>
          )}
        </div>
      </div>

      {open && (
        <div className="story-modal" onClick={closeStory}>
          <article className="card story-reader" id="story-open" onClick={(event) => event.stopPropagation()}>
            {editing ? (
              <form onSubmit={(event) => void saveEdit(event)}>
                <div className="story-reader-top">
                  <h2 style={{ margin: 0 }}>Редактировать</h2>
                  <button className="btn ghost" type="button" onClick={() => { setEditing(false); setEditFiles([]) }} aria-label="Закрыть">
                    ✕
                  </button>
                </div>
                <label className="field">
                  Заголовок
                  <input className="input" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} required />
                </label>
                <label className="field">
                  Текст
                  <textarea className="area" rows={8} value={editBody} onChange={(e) => setEditBody(e.target.value)} required />
                </label>
                <label className="field">
                  Регион
                  <select className="input" value={editRegionId} onChange={(e) => setEditRegionId(e.target.value)}>
                    <option value="">Без региона</option>
                    {regions.map((region) => (
                      <option key={region.id} value={region.id}>{region.name}</option>
                    ))}
                  </select>
                </label>
                <div className="story-edit-photos">
                  {(photosByStory.get(open.id) ?? []).map((photo) => (
                    <div key={photo.id} className="story-edit-thumb">
                      <AuthMedia
                        id={photo.id}
                        alt={open.title}
                        contentType={photo.contentType}
                        className="cover"
                      />
                      <button
                        className="media-thumb-x"
                        type="button"
                        aria-label="Удалить фото"
                        disabled={busy}
                        onClick={() => {
                          void api.deletePhoto(photo.id).then(reload).catch((err) => {
                            setError(err instanceof Error ? err.message : 'Не получилось удалить файл')
                          })
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <MediaAttach
                  files={editFiles}
                  onChange={setEditFiles}
                  emptyLabel="Добавить фото или видео"
                  uploading={busy}
                  uploadingLabel={editFiles.length > 0 ? 'Загружаю фото…' : 'Сохраняю…'}
                />
                <div className="story-modal-foot">
                  <button className="btn teal" type="submit" disabled={busy}>
                    {busy ? 'Сохраняю…' : 'Сохранить'}
                  </button>
                  <button className="btn ghost" type="button" disabled={busy} onClick={() => { setEditing(false); setEditFiles([]) }}>
                    Отмена
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="story-reader-top">
                  <div>
                    <p className="kicker">{regionName(open.regionId) ?? 'Без региона'}</p>
                    <h2 style={{ marginTop: 4 }}>{open.title}</h2>
                  </div>
                  <div className="story-reader-actions">
                    <button className="btn light" type="button" onClick={startEdit}>
                      Изменить
                    </button>
                    <button className="btn ghost" type="button" onClick={closeStory} aria-label="Закрыть">
                      ✕
                    </button>
                  </div>
                </div>
                <p className="story-reader-body">{open.body}</p>
                <MediaGallery photos={photosByStory.get(open.id) ?? []} alt={open.title} />
                <button
                  className="btn danger"
                  style={{ marginTop: 20 }}
                  type="button"
                  onClick={async () => {
                    if (!window.confirm('Удалить эту историю? Это нельзя отменить.')) return
                    await api.deleteStory(open.id)
                    closeStory()
                    await reload()
                  }}
                >
                  Удалить историю
                </button>
              </>
            )}
          </article>
        </div>
      )}
    </section>
  )
}
