import { Bell } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { api } from '../api'
import type { AppNotification, NotificationFeed } from '../types'
import { UserAvatar } from './UserAvatar'

const empty: NotificationFeed = { items: [], unreadCount: 0 }

function textFor(item: AppNotification) {
  if (item.type === 'FRIEND_REQUEST') return `${item.actor.displayName} хочет добавить тебя в друзья`
  return `Теперь вы друзья с ${item.actor.displayName}`
}

export function NotificationBell() {
  const [feed, setFeed] = useState<NotificationFeed>(empty)
  const [open, setOpen] = useState(false)
  const [busyId, setBusyId] = useState<string>()
  const root = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)

  async function reload() {
    setFeed(await api.notifications())
  }

  useEffect(() => {
    void reload().catch(() => setFeed(empty))
    const timer = window.setInterval(() => {
      void reload().catch(() => undefined)
    }, 20000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!open) return
    const onClick = (event: MouseEvent) => {
      const target = event.target as Node
      if (root.current?.contains(target) || panel.current?.contains(target)) return
      setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('mousedown', onClick)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onClick)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  async function toggle() {
    const next = !open
    setOpen(next)
    if (next && feed.unreadCount > 0) {
      try {
        setFeed(await api.readNotifications())
      } catch {
        /* keep current list */
      }
    }
  }

  async function act(item: AppNotification, action: () => Promise<unknown>) {
    setBusyId(item.id)
    setFeed((current) => ({
      items: current.items.filter((row) => row.id !== item.id),
      unreadCount: current.items.filter((row) => row.id !== item.id && !row.read).length,
    }))
    try {
      await action()
      await reload()
    } catch {
      await reload()
    } finally {
      setBusyId(undefined)
    }
  }

  return (
    <div className="notify" ref={root}>
      <button
        className="notify-btn"
        type="button"
        aria-label="Уведомления"
        aria-expanded={open}
        onClick={() => void toggle()}
      >
        <Bell size={18} strokeWidth={2.1} />
        {feed.unreadCount > 0 && (
          <span className="notify-badge">{feed.unreadCount > 9 ? '9+' : feed.unreadCount}</span>
        )}
      </button>
      {open &&
        createPortal(
          <div className="notify-panel" ref={panel}>
            <div className="notify-head">Уведомления</div>
            {feed.items.length === 0 ? (
              <p className="muted notify-empty">Пока тихо — заявки в друзья появятся здесь.</p>
            ) : (
              <ul className="notify-list">
                {feed.items.map((item) => (
                  <li key={item.id} className={`notify-item${item.read ? '' : ' unread'}`}>
                    <UserAvatar
                      name={item.actor.displayName}
                      avatarUrl={item.actor.avatarUrl}
                      className="header-avatar"
                    />
                    <div className="notify-body">
                      <p>{textFor(item)}</p>
                      {item.type === 'FRIEND_REQUEST' ? (
                        <div className="notify-actions">
                          <button
                            className="btn teal"
                            type="button"
                            disabled={busyId === item.id}
                            onClick={() => void act(item, () => api.acceptFriend(item.actor.id))}
                          >
                            Принять
                          </button>
                          <button
                            className="btn ghost"
                            type="button"
                            disabled={busyId === item.id}
                            onClick={() => void act(item, () => api.removeFriend(item.actor.id))}
                          >
                            Отклонить
                          </button>
                        </div>
                      ) : (
                        <Link className="notify-link" to={`/people/${item.actor.id}`} onClick={() => setOpen(false)}>
                          Открыть профиль
                        </Link>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>,
          document.body,
        )}
    </div>
  )
}
