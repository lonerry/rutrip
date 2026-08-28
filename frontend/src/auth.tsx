import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, getToken, setToken } from './api'
import type { User } from './types'

function withAvatarCache(user: User): User {
  if (!user.avatarUrl) return user
  const base = user.avatarUrl.split('?')[0]
  return { ...user, avatarUrl: `${base}?t=${Date.now()}` }
}

function fromAuth(response: User & { token: string }): User {
  return {
    id: response.id,
    email: response.email,
    displayName: response.displayName,
    avatarUrl: response.avatarUrl,
    mapColor: response.mapColor,
  }
}

type AuthContextValue = {
  user: User | null
  ready: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, displayName: string) => Promise<void>
  resetPassword: (email: string, token: string, password: string) => Promise<void>
  logout: () => void
  applyUser: (user: User) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!getToken()) {
      setReady(true)
      return
    }
    api
      .me()
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setReady(true))
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      ready,
      async login(email, password) {
        const response = await api.login(email, password)
        setToken(response.token)
        setUser(fromAuth(response))
      },
      async register(email, password, displayName) {
        const response = await api.register(email, password, displayName)
        setToken(response.token)
        setUser(fromAuth(response))
      },
      async resetPassword(email, token, password) {
        const response = await api.resetPassword(email, token, password)
        setToken(response.token)
        setUser(fromAuth(response))
      },
      logout() {
        setToken(null)
        setUser(null)
      },
      applyUser(next) {
        setUser(withAvatarCache(next))
      },
    }),
    [user, ready],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('AuthProvider is missing')
  return context
}
