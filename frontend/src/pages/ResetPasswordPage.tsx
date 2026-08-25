import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth'

export function ResetPasswordPage() {
  const { resetPassword } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token')?.trim() ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('Пароли не совпадают')
      return
    }
    setBusy(true)
    try {
      await resetPassword(token, password)
      navigate('/map', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не получилось сохранить пароль')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={onSubmit}>
        <p className="kicker">Новый пароль</p>
        <h1>Придумай пароль</h1>
        {error && <p className="error">{error}</p>}
        {!token ? (
          <>
            <p className="muted">В ссылке нет токена. Запроси письмо ещё раз.</p>
            <p className="muted" style={{ textAlign: 'center', marginTop: 16 }}>
              <Link to="/forgot-password">Сбросить пароль</Link>
            </p>
          </>
        ) : (
          <>
            <label className="field">
              Новый пароль
              <input
                type="password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            <label className="field">
              Ещё раз
              <input
                type="password"
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </label>
            <button className="btn full" style={{ marginTop: 20 }} type="submit" disabled={busy}>
              Сохранить и войти
            </button>
            <p className="muted" style={{ textAlign: 'center', marginTop: 16 }}>
              <Link to="/login">Вернуться ко входу</Link>
            </p>
          </>
        )}
      </form>
    </div>
  )
}
