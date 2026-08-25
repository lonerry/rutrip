import { Map } from 'lucide-react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth'
import { NotificationBell } from './NotificationBell'
import { UserAvatar } from './UserAvatar'

function MainNav({ className }: { className: string }) {
  return (
    <nav className={className}>
      <NavLink to="/map">Карта</NavLink>
      <NavLink to="/stories">Истории</NavLink>
      <NavLink to="/people">Люди</NavLink>
      <NavLink to="/profile">Профиль</NavLink>
    </nav>
  )
}

export function Layout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const isMap = location.pathname === '/map' || location.pathname.startsWith('/map/')

  return (
    <div className="shell">
      <header className="header">
        <NavLink to="/" className="brand">
          <span className="brand-mark">
            <Map size={18} strokeWidth={2.2} />
          </span>
          <span className="brand-name">Rutrip</span>
        </NavLink>
        <MainNav className="pill-nav" />
        <div className="header-end">
          {user && <NotificationBell />}
          <div className="header-actions">
            {user ? (
              <>
                <Link to="/profile" className="header-user">
                  <UserAvatar name={user.displayName} avatarUrl={user.avatarUrl} className="header-avatar" />
                  <span className="muted">{user.displayName}</span>
                </Link>
                <button className="btn ghost header-logout" onClick={logout} type="button">
                  Выйти
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className="muted header-login">
                  Войти
                </NavLink>
                <NavLink to="/register" className="btn">
                  Начать
                </NavLink>
              </>
            )}
          </div>
        </div>
      </header>
      <MainNav className="tab-nav" />
      <div className={isMap ? 'map-shell' : 'page'}>
        <Outlet />
      </div>
    </div>
  )
}
