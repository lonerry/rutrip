import { useEffect, useState } from 'react'
import { loadAvatarBlob } from '../api'

export function UserAvatar({
  name,
  avatarUrl,
  className = 'person-avatar',
}: {
  name: string
  avatarUrl?: string | null
  className?: string
}) {
  const [src, setSrc] = useState<string>()

  useEffect(() => {
    if (!avatarUrl) {
      setSrc(undefined)
      return
    }
    let url: string | undefined
    loadAvatarBlob(avatarUrl)
      .then((value) => {
        url = value
        setSrc(value)
      })
      .catch(() => setSrc(undefined))
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [avatarUrl])

  if (src) return <img src={src} alt={name} className={className} />
  return <div className={className}>{name.slice(0, 1).toUpperCase()}</div>
}
