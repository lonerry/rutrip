import { Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../api'
import { searchPlaces } from '../geoSearch'
import { ruKind } from '../here'
import type { GeoHit, Place } from '../types'

function parseCoords(query: string) {
  const match = query.trim().match(/^(-?\d{1,3}(?:[.,]\d+)?)\s*[,;]\s*(-?\d{1,3}(?:[.,]\d+)?)$/)
    ?? query.trim().match(/^(-?\d{1,3}(?:\.\d+)?)\s+(-?\d{1,3}(?:\.\d+)?)$/)
  if (!match) return null
  const lat = Number(match[1].replace(',', '.'))
  const lng = Number(match[2].replace(',', '.'))
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  if (!match[1].includes('.') && !match[1].includes(',') && !match[2].includes('.') && !match[2].includes(',')) {
    return null
  }
  return { lat, lng }
}

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

  const coords = useMemo(() => parseCoords(q), [q])
  const coordHit: GeoHit | null = coords
    ? {
        name: `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`,
        description: 'Точка по координатам',
        lat: coords.lat,
        lng: coords.lng,
        bbox: null,
        kind: 'точка',
      }
    : null

  useEffect(() => {
    if (q.length < 2 || coords) {
      setHits([])
      setLoading(false)
      return
    }
    const id = ++seq.current
    setLoading(true)
    const timer = window.setTimeout(() => {
      searchPlaces(q, nearRef.current, api.geoSearch)
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
    }, 140)
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
  const empty = !loading && mine.length === 0 && hits.length === 0 && !coordHit

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
              } else if (coordHit) {
                onPickHit(coordHit)
                setQuery('')
                setOpen(false)
              } else if (hits[0]) {
                onPickHit(hits[0])
                setQuery('')
                setOpen(false)
              }
            }
          }}
          placeholder="Место или 56.01, 92.87"
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
          {coordHit && (
            <button
              type="button"
              onClick={() => {
                onPickHit(coordHit)
                setQuery('')
                setOpen(false)
              }}
            >
              <strong>{coordHit.name}</strong>
              <span className="muted">Точка по координатам</span>
            </button>
          )}
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
