import { photoUrl } from '../api'

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
  const src = photoUrl(id)
  if (isVideo(contentType)) {
    return (
      <video
        className={className}
        controls={controls}
        playsInline
        preload="metadata"
      >
        <source src={src} type={contentType} />
      </video>
    )
  }
  return <img src={src} alt={alt} className={className} />
}
