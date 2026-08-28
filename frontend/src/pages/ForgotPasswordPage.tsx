import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const response = await api.forgotPassword(email)
      setDone(response.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не получилось отправить письмо')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={onSubmit}>
        <p className="kicker">Восстановление</p>
        <h1>Забыли пароль?</h1>
        {error && <p className="error">{error}</p>}
        {done ? (
          <>
            <p className="success">{done}</p>
            <p className="muted">Проверь почту и открой ссылку из письма — там можно задать новый пароль.</p>
            <p className="muted" style={{ textAlign: 'center', marginTop: 16 }}>
              <Link to="/login">Вернуться ко входу</Link>
            </p>
          </>
        ) : (
          <>
            <p className="muted">Напишем на email ссылку. Она действует час.</p>
            <label className="field">
              Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={busy} />
            </label>
            <button className="btn full" style={{ marginTop: 20 }} type="submit" disabled={busy}>
              {busy ? 'Отправляю…' : 'Отправить ссылку'}
            </button>
            <p className="muted" style={{ textAlign: 'center', marginTop: 16 }}>
              Вспомнил пароль? <Link to="/login">Войти</Link>
            </p>
          </>
        )}
      </form>
    </div>
  )
}
