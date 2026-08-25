import { Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../api'
import { ruKind } from '../here'
import type { GeoHit, Place } from '../types'

export function MapSearch({
  places,
  near,
  onPickHit,
  onPickPlace,
}: {
  places: Place[]
  near?: { lat: number; lng: number }
  onPickHit: (hit: GeoHit) => void
  onPickPlace: (place: Place) => void
}) {
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<GeoHit[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const seq = useRef(0)
  const nearRef = useRef(near)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    nearRef.current = near
  }, [near])

  const q = query.trim()
  const mine = useMemo(() => {
    if (q.length < 2) return []
    const needle = q.toLowerCase()
    return places.filter((place) => place.title.toLowerCase().includes(needle)).slice(0, 3)
  }, [places, q])

  useEffect(() => {
    if (q.length < 2) {
      setHits([])
      setLoading(false)
      return
    }
    const id = ++seq.current
    setLoading(true)
    const timer = window.setTimeout(() => {
      api.geoSearch(q, nearRef.current)
        .then((next) => {
          if (id !== seq.current) return
          setHits(next)
        })
        .catch(() => {
          if (id === seq.current) setHits([])
        })
        .finally(() => {
          if (id === seq.current) setLoading(false)
        })
    }, 320)
    return () => window.clearTimeout(timer)
  }, [q])

  useEffect(() => {
    const onDoc = (event: MouseEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const showList = open && q.length >= 2
  const empty = !loading && mine.length === 0 && hits.length === 0

  return (
    <div className="map-search" ref={boxRef} onMouseDown={(event) => event.stopPropagation()}>
      <label className="map-search-box">
        <Search size={16} strokeWidth={2.2} />
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setOpen(false)
              event.currentTarget.blur()
            }
            if (event.key === 'Enter') {
              event.preventDefault()
              if (mine[0]) {
                onPickPlace(mine[0])
                setQuery('')
                setOpen(false)
              } else if (hits[0]) {
                onPickHit(hits[0])
                setQuery('')
                setOpen(false)
              }
            }
          }}
          placeholder="Найти озеро, город, место…"
          autoComplete="off"
        />
        {query && (
          <button
            className="map-search-clear"
            type="button"
            aria-label="Очистить"
            onClick={() => {
              setQuery('')
              setHits([])
            }}
          >
            ×
          </button>
        )}
      </label>
      {showList && (
        <div className="map-search-results">
          {mine.map((place) => (
            <button
              key={place.id}
              type="button"
              onClick={() => {
                onPickPlace(place)
                setQuery('')
                setOpen(false)
              }}
            >
              <strong>{place.title}</strong>
              <span className="muted">Моя точка</span>
            </button>
          ))}
          {hits.map((hit, index) => (
            <button
              key={`${hit.name}:${hit.lat}:${hit.lng}:${index}`}
              type="button"
              onClick={() => {
                onPickHit(hit)
                setQuery('')
                setOpen(false)
              }}
            >
              <strong>{hit.name}</strong>
              {(hit.kind || hit.description) && (
                <span className="muted">{[ruKind(hit.kind), hit.description].filter(Boolean).join(' · ')}</span>
              )}
            </button>
          ))}
          {loading && <p className="muted map-search-empty">Ищу…</p>}
          {empty && <p className="muted map-search-empty">Ничего не нашла. Попробуй другое название.</p>}
        </div>
      )}
    </div>
  )
}
