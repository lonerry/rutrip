import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'

export function ResetPasswordPage() {
  const { resetPassword } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
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
      await resetPassword(email.trim(), code.trim(), password)
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
        <p className="muted">Код из письма и новый пароль.</p>
        <label className="field">
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={busy} />
        </label>
        <label className="field">
          Код
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            required
            minLength={6}
            maxLength={6}
            disabled={busy}
          />
        </label>
        <label className="field">
          Новый пароль
          <input
            type="password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={busy}
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
            disabled={busy}
          />
        </label>
        <button className="btn full" style={{ marginTop: 20 }} type="submit" disabled={busy}>
          {busy ? 'Сохраняю…' : 'Сохранить и войти'}
        </button>
        <p className="muted" style={{ textAlign: 'center', marginTop: 16 }}>
          Нет кода? <Link to="/forgot-password">Запросить ещё раз</Link>
        </p>
      </form>
    </div>
  )
}
