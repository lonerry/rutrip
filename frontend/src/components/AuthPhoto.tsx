import { useEffect, useState } from 'react'
import { loadPhotoBlob } from '../api'

export function isVideo(contentType: string | undefined) {
  return (contentType ?? '').startsWith('video/')
}

export function AuthMedia({
  id,
  alt,
  contentType,
  className = '',
  controls = true,
}: {
  id: string
  alt: string
  contentType?: string
  className?: string
  controls?: boolean
}) {
  const [src, setSrc] = useState<string>()

  useEffect(() => {
    let url: string | undefined
    loadPhotoBlob(id)
      .then((value) => {
        url = value
        setSrc(value)
      })
      .catch(() => setSrc(undefined))
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [id])

  if (!src) return <div className={`pulse ${className}`} />
  if (isVideo(contentType)) {
    return <video src={src} className={className} controls={controls} playsInline preload="metadata" />
  }
  return <img src={src} alt={alt} className={className} />
}
