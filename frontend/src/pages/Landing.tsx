import { Link } from 'react-router-dom'
import { useAuth } from '../auth'

export function Landing() {
  const { user } = useAuth()
  const toMap = user ? '/map' : '/register'

  return (
    <>
      <section className="hero">
        <div>
          <p className="kicker">Rutrip</p>
          <h1 className="display">Отмечай регионы, которые уже стали твоими.</h1>
          <p className="lead">
            Кликни субъект на карте — справа откроются его фото, истории и точки. Как дневник путешествий, только живой.
          </p>
          <div className="row">
            <Link className="btn" to={toMap}>
              {user ? 'Открыть карту' : 'Начать бесплатно'}
            </Link>
            <Link className="btn light" to="/stories">
              Смотреть истории
            </Link>
          </div>
        </div>
        <div className="hero-photo" role="img" aria-label="Пейзаж России" />
      </section>

      <section className="wrap grid-3">
        <div className="card stat">
          <b>89</b>
          субъектов РФ
        </div>
        <div className="card stat">
          <b>1 клик</b>
          регион, фото и истории
        </div>
        <div className="card stat">
          <b>Личный</b>
          архив поездок
        </div>
      </section>

      <section className="wrap">
        <h2>Как это работает</h2>
        <div className="grid-3">
          <article className="card">
            <div className="icon">01</div>
            <h3>Кликни регион</h3>
            <p className="muted">Справа выезжает карточка: отметить визит и посмотреть всё, что с ним связано.</p>
          </article>
          <article className="card">
            <div className="icon">02</div>
            <h3>Добавь фото</h3>
            <p className="muted">Снимки живут внутри региона — не в общей куче без адреса.</p>
          </article>
          <article className="card">
            <div className="icon">03</div>
            <h3>Напиши историю</h3>
            <p className="muted">Короткий рассказ и точка на карте. Потом это выглядит как журнал.</p>
          </article>
        </div>
      </section>
    </>
  )
}
