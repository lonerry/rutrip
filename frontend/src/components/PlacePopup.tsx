import { ImagePlus, Pencil, Trash2 } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../api'
import type { Photo, Place } from '../types'
import { AuthMedia, isVideo } from './AuthPhoto'

export function PlacePopup({
  place,
  photos,
  readOnly,
  onReload,
  onError,
}: {
  place: Place
  photos: Photo[]
  readOnly: boolean
  onReload: () => Promise<void>
  onError: (message: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [title, setTitle] = useState(place.title)
  const [description, setDescription] = useState(place.description ?? '')
  const [file, setFile] = useState<File>()

  const preview =
    photos.find((photo) => photo.placeId === place.id && !isVideo(photo.contentType)) ??
    photos.find((photo) => photo.placeId === place.id)

  useEffect(() => {
    setTitle(place.title)
    setDescription(place.description ?? '')
    setEditing(false)
    setFile(undefined)
  }, [place.id, place.title, place.description])

  async function uploadPreview(next: File) {
    setBusy(true)
    onError('')
    try {
      await api.uploadMedia([next], { placeId: place.id })
      setFile(undefined)
      await onReload()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Не получилось загрузить фото')
    } finally {
      setBusy(false)
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    onError('')
    try {
      await api.updatePlace(place.id, {
        title,
        description,
        lat: place.lat,
        lng: place.lng,
        regionId: place.regionId,
      })
      if (file) await api.uploadMedia([file], { placeId: place.id })
      setEditing(false)
      setFile(undefined)
      await onReload()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Не получилось сохранить точку')
    } finally {
      setBusy(false)
    }
  }

  if (editing && !readOnly) {
    return (
      <form className="place-card" onSubmit={save} onClick={(event) => event.stopPropagation()}>
        <PreviewSlot preview={preview} file={file} alt={place.title} />
        <label className="place-card-file">
          {file ? 'Фото выбрано' : preview ? 'Заменить фото' : 'Добавить фото'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            hidden
            onChange={(event) => setFile(event.target.files?.[0])}
          />
        </label>
        <input
          className="input"
          value={title}
          onChange={(event) => setTitle(event.target.value.slice(0, 25))}
          placeholder="Название"
          maxLength={25}
          required
        />
        <p className="muted" style={{ margin: '2px 0 0', fontSize: 10 }}>{title.length}/25</p>
        <textarea
          className="area"
          value={description}
          onChange={(event) => setDescription(event.target.value.slice(0, 500))}
          placeholder="Заметка"
          maxLength={500}
          rows={3}
        />
        <p className="muted" style={{ margin: '2px 0 0', fontSize: 10 }}>{description.length}/500</p>
        <div className="row" style={{ marginTop: 6, gap: 6 }}>
          <button className="btn teal" type="submit" disabled={busy} style={{ padding: '6px 12px', fontSize: 13 }}>
            Сохранить
          </button>
          <button className="btn ghost" type="button" disabled={busy} onClick={() => setEditing(false)} style={{ padding: '6px 10px' }}>
            Отмена
          </button>
        </div>
      </form>
    )
  }

  return (
    <div className="place-card" onClick={(event) => event.stopPropagation()}>
      {preview ? (
        <AuthMedia id={preview.id} alt={place.title} contentType={preview.contentType} className="place-card-preview" />
      ) : readOnly ? null : (
        <label className="place-card-add">
          <ImagePlus size={16} />
          Добавить фото
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            hidden
            disabled={busy}
            onChange={(event) => {
              const next = event.target.files?.[0]
              if (next) void uploadPreview(next)
            }}
          />
        </label>
      )}
      <div className="place-card-text">
        <strong>{place.title}</strong>
        {place.description && <p className="muted">{place.description}</p>}
      </div>
      {!readOnly && (
        <div className="place-card-actions">
          <button
            className="icon-btn"
            type="button"
            data-tip="Редактировать"
            aria-label="Редактировать"
            onClick={() => setEditing(true)}
          >
            <Pencil size={13} />
          </button>
          <button
            className="icon-btn danger"
            type="button"
            data-tip="Удалить точку"
            aria-label="Удалить точку"
            disabled={busy}
            onClick={async () => {
              onError('')
              try {
                await api.deletePlace(place.id)
                await onReload()
              } catch (err) {
                onError(err instanceof Error ? err.message : 'Не получилось удалить точку')
              }
            }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </div>
  )
}

function PreviewSlot({
  preview,
  file,
  alt,
}: {
  preview?: Photo
  file?: File
  alt: string
}) {
  const [local, setLocal] = useState<string>()
  useEffect(() => {
    if (!file) {
      setLocal(undefined)
      return
    }
    const url = URL.createObjectURL(file)
    setLocal(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  if (local) return <img src={local} alt="" className="place-card-preview" />
  if (preview) return <AuthMedia id={preview.id} alt={alt} contentType={preview.contentType} className="place-card-preview" />
  return null
}
