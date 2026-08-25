import { useEffect, useState } from 'react'
import { UploadOverlay } from './UploadOverlay'

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime'

type Preview = { url: string; video: boolean }

export function MediaAttach({
  files,
  onChange,
  emptyLabel = 'Фото или видео',
  uploading = false,
  uploadingLabel = 'Загружаю фото…',
}: {
  files: File[]
  onChange: (files: File[]) => void
  emptyLabel?: string
  uploading?: boolean
  uploadingLabel?: string
}) {
  const [previews, setPreviews] = useState<Preview[]>([])

  useEffect(() => {
    const next = files.map((file) => ({
      url: URL.createObjectURL(file),
      video: file.type.startsWith('video/'),
    }))
    setPreviews(next)
    return () => {
      for (const item of next) URL.revokeObjectURL(item.url)
    }
  }, [files])

  return (
    <div className={`media-attach${uploading ? ' is-uploading' : ''}`}>
      <UploadOverlay show={uploading} label={uploadingLabel} />
      {previews.length > 0 && (
        <div className="media-thumbs">
          {previews.map((item, index) => (
            <div key={item.url} className="media-thumb">
              {item.video ? (
                <video src={item.url} muted playsInline preload="metadata" />
              ) : (
                <img src={item.url} alt="" />
              )}
              {!uploading && (
                <button
                  className="media-thumb-x"
                  type="button"
                  aria-label="Удалить"
                  onClick={() => onChange(files.filter((_, i) => i !== index))}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      <label className={`media-add${uploading ? ' disabled' : ''}`}>
        <input
          type="file"
          accept={ACCEPT}
          multiple
          disabled={uploading}
          onChange={(event) => {
            const added = Array.from(event.target.files ?? [])
            event.target.value = ''
            if (added.length) onChange([...files, ...added])
          }}
        />
        {uploading ? 'Загружаю…' : files.length > 0 ? 'Добавить ещё' : emptyLabel}
      </label>
    </div>
  )
}
