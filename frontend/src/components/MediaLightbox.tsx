import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { createPortal } from 'react-dom'
import type { Photo } from '../types'
import { AuthMedia, isVideo } from './AuthPhoto'

export function MediaThumb({
  photo,
  alt,
  className = 'cover',
  onOpen,
}: {
  photo: Photo
  alt: string
  className?: string
  onOpen: () => void
}) {
  return (
    <button type="button" className="media-thumb" onClick={onOpen}>
      <AuthMedia id={photo.id} alt={alt} contentType={photo.contentType} className={className} controls={false} />
      {isVideo(photo.contentType) && <span className="media-thumb-play" aria-hidden />}
    </button>
  )
}

export function MediaGallery({
  photos,
  alt,
  className = 'photos',
}: {
  photos: Photo[]
  alt: string
  className?: string
}) {
  const [index, setIndex] = useState<number | null>(null)
  if (photos.length === 0) return null
  return (
    <>
      <div className={className}>
        {photos.map((photo, i) => (
          <MediaThumb key={photo.id} photo={photo} alt={alt} onOpen={() => setIndex(i)} />
        ))}
      </div>
      {index != null && (
        <MediaLightbox photos={photos} index={index} alt={alt} onClose={() => setIndex(null)} onIndex={setIndex} />
      )}
    </>
  )
}

export function MediaLightbox({
  photos,
  index,
  alt,
  onClose,
  onIndex,
}: {
  photos: Photo[]
  index: number
  alt: string
  onClose: () => void
  onIndex: (index: number) => void
}) {
  const start = useRef<number | null>(null)
  const photo = photos[index]

  function go(next: number) {
    if (photos.length === 0) return
    onIndex((next + photos.length) % photos.length)
  }

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowRight') onIndex((index + 1) % photos.length)
      if (event.key === 'ArrowLeft') onIndex((index - 1 + photos.length) % photos.length)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [index, onClose, onIndex, photos.length])

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest('button, video')) return
    start.current = event.clientX
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (start.current == null) return
    const dx = event.clientX - start.current
    start.current = null
    if (dx < -50) go(index + 1)
    if (dx > 50) go(index - 1)
  }

  if (!photo) return null

  return createPortal(
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Просмотр медиа"
      onClick={onClose}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      <button className="lightbox-x" type="button" aria-label="Закрыть" onClick={onClose}>
        ✕
      </button>
      {photos.length > 1 && (
        <>
          <button
            className="lightbox-nav prev"
            type="button"
            aria-label="Назад"
            onClick={(event) => {
              event.stopPropagation()
              go(index - 1)
            }}
          >
            ‹
          </button>
          <button
            className="lightbox-nav next"
            type="button"
            aria-label="Дальше"
            onClick={(event) => {
              event.stopPropagation()
              go(index + 1)
            }}
          >
            ›
          </button>
          <p className="lightbox-count">
            {index + 1} / {photos.length}
          </p>
        </>
      )}
      <div className="lightbox-stage" onClick={(event) => event.stopPropagation()}>
        <AuthMedia
          id={photo.id}
          alt={alt}
          contentType={photo.contentType}
          className="lightbox-media"
        />
      </div>
    </div>,
    document.body,
  )
}
