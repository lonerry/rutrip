import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import type { Person } from '../types'
import { UserAvatar } from '../components/UserAvatar'

export function PeoplePage() {
  const [query, setQuery] = useState('')
  const [people, setPeople] = useState<Person[]>([])
  const [friends, setFriends] = useState<Person[]>([])
  const [incoming, setIncoming] = useState<Person[]>([])
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string>()

  async function reload(search = query) {
    const [nextPeople, nextFriends, nextIncoming] = await Promise.all([
      api.people(search),
      api.friends(),
      api.incomingFriends(),
    ])
    setPeople(nextPeople)
    setFriends(nextFriends)
    setIncoming(nextIncoming)
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      reload(query).catch((err) => setError(err instanceof Error ? err.message : 'Ошибка загрузки'))
    }, 200)
    return () => window.clearTimeout(timer)
  }, [query])

  async function act(id: string, action: () => Promise<unknown>) {
    setBusyId(id)
    setError('')
    try {
      await action()
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не получилось')
    } finally {
      setBusyId(undefined)
    }
  }

  return (
    <section className="wrap page" style={{ maxWidth: 760 }}>
      <p className="kicker">People</p>
      <h1>Люди</h1>
      <p className="muted">Найди человека и добавь в друзья — тогда откроется его карта, фото и истории.</p>
      {error && <p className="error">{error}</p>}

      <input
        className="input"
        style={{ marginTop: 20 }}
        placeholder="Имя или email"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {incoming.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <h2>Заявки в друзья</h2>
          {incoming.map((person) => (
            <PersonRow
              key={person.id}
              person={person}
              busy={busyId === person.id}
              onAccept={() => act(person.id, () => api.acceptFriend(person.id))}
              onDecline={() => act(person.id, () => api.removeFriend(person.id))}
            />
          ))}
        </div>
      )}

      {friends.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <h2>Друзья</h2>
          {friends.map((person) => (
            <PersonRow
              key={person.id}
              person={person}
              busy={busyId === person.id}
              onRemove={() => act(person.id, () => api.removeFriend(person.id))}
            />
          ))}
        </div>
      )}

      <div style={{ marginTop: 28 }}>
        <h2>{query ? 'Результаты' : 'Все'}</h2>
        {people.length === 0 ? (
          <p className="muted">Никого не нашлось. Пусть друг тоже зарегистрируется.</p>
        ) : (
          people.map((person) => (
            <PersonRow
              key={person.id}
              person={person}
              busy={busyId === person.id}
              onAdd={() => act(person.id, () => api.requestFriend(person.id))}
              onAccept={() => act(person.id, () => api.acceptFriend(person.id))}
              onRemove={() => act(person.id, () => api.removeFriend(person.id))}
            />
          ))
        )}
      </div>
    </section>
  )
}

function PersonRow({
  person,
  busy,
  onAdd,
  onAccept,
  onDecline,
  onRemove,
}: {
  person: Person
  busy?: boolean
  onAdd?: () => void
  onAccept?: () => void
  onDecline?: () => void
  onRemove?: () => void
}) {
  return (
    <article className="person-row">
      <div className="person-avatar-wrap">
        <UserAvatar name={person.displayName} avatarUrl={person.avatarUrl} className="person-avatar" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Link to={`/people/${person.id}`} style={{ fontWeight: 700 }}>
          {person.displayName}
        </Link>
        <p className="muted" style={{ margin: '2px 0 0', fontSize: 13 }}>
          {label(person)}
          {person.relation === 'friends' ? ` · ${person.visitedCount} регионов` : ''}
        </p>
      </div>
      <div className="row" style={{ marginTop: 0, gap: 8 }}>
        {person.relation === 'friends' && (
          <>
            <Link className="btn teal" to={`/map/${person.id}`}>
              Карта
            </Link>
            {onRemove && (
              <button className="btn ghost" type="button" disabled={busy} onClick={onRemove}>
                Удалить
              </button>
            )}
          </>
        )}
        {person.relation === 'none' && onAdd && (
          <button className="btn teal" type="button" disabled={busy} onClick={onAdd}>
            Добавить
          </button>
        )}
        {person.relation === 'outgoing' && (
          <button className="btn light" type="button" disabled={busy} onClick={onRemove}>
            Отменить
          </button>
        )}
        {person.relation === 'incoming' && (
          <>
            <button className="btn teal" type="button" disabled={busy} onClick={onAccept}>
              Принять
            </button>
            {onDecline && (
              <button className="btn ghost" type="button" disabled={busy} onClick={onDecline}>
                Отклонить
              </button>
            )}
          </>
        )}
      </div>
    </article>
  )
}

function label(person: Person) {
  if (person.relation === 'friends') return 'Друзья'
  if (person.relation === 'outgoing') return 'Заявка отправлена'
  if (person.relation === 'incoming') return 'Хочет добавить тебя'
  return 'Ещё не в друзьях'
}
