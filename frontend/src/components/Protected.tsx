import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth'

export function Protected({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth()
  const location = useLocation()
  if (!ready) return <div className="section">Загрузка...</div>
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return children
}
