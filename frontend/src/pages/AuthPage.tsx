import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/map'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'register') await register(email, password, displayName)
      else await login(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не получилось')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={onSubmit}>
        <p className="kicker">{mode === 'login' ? 'С возвращением' : 'Новая карта'}</p>
        <h1>{mode === 'login' ? 'Войти' : 'Создать аккаунт'}</h1>
        {error && <p className="error">{error}</p>}
        {mode === 'register' && (
          <label className="field">
            Имя
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required disabled={busy} />
          </label>
        )}
        <label className="field">
          Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={busy} />
        </label>
        <label className="field">
          Пароль
          <input type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required disabled={busy} />
        </label>
        {mode === 'login' && (
          <p className="auth-forgot">
            <Link to="/forgot-password">Забыли пароль?</Link>
          </p>
        )}
        <button className="btn full" style={{ marginTop: 20 }} type="submit" disabled={busy}>
          {busy ? (mode === 'login' ? 'Входим…' : 'Создаём аккаунт…') : mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
        </button>
        <p className="muted" style={{ textAlign: 'center', marginTop: 16 }}>
          {mode === 'login' ? (
            <>
              Нет аккаунта? <Link to="/register">Создать</Link>
            </>
          ) : (
            <>
              Уже есть? <Link to="/login">Войти</Link>
            </>
          )}
        </p>
      </form>
    </div>
  )
}
