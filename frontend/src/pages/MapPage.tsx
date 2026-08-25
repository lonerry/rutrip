import L from 'leaflet'
import { useEffect, useMemo, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useSearchParams } from 'react-router-dom'
import { GeoJSON, MapContainer, Marker, Rectangle, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { api } from '../api'
import { useAuth } from '../auth'
import { RegionSheet } from '../components/RegionSheet'
import { PlacePopup } from '../components/PlacePopup'
import { regionCodeFromFeature } from '../geo'
import { lookupHere, type HereItem } from '../here'
import { normalizeMapColor, strokeFromFill } from '../mapColor'
import type { Photo, Place, Region, Story } from '../types'

const placeIcon = L.divIcon({
  className: 'map-pin-icon',
  iconSize: [20, 26],
  iconAnchor: [10, 25],
  popupAnchor: [0, -22],
  html: `<svg width="20" height="26" viewBox="0 0 20 26" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <ellipse cx="10" cy="24.6" rx="3.4" ry="1.1" fill="rgba(15,23,42,.28)"/>
    <path d="M10 1.2c-4.6 0-8.3 3.6-8.3 8.1 0 6.2 8.3 14.4 8.3 14.4s8.3-8.2 8.3-14.4C18.3 4.8 14.6 1.2 10 1.2z" fill="#e31e24"/>
    <circle cx="10" cy="9.1" r="3.05" fill="#fff"/>
  </svg>`,
})

const PAGE_BG = '#f8fafc'
const YANDEX_KEY = import.meta.env.VITE_YANDEX_MAPS_KEY as string | undefined
const YANDEX_TILES = YANDEX_KEY
  ? `https://tiles.api-maps.yandex.ru/v1/tiles/?apikey=${encodeURIComponent(YANDEX_KEY)}&lang=ru_RU&l=map&x={x}&y={y}&z={z}&scale=1&projection=web_mercator`
  : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
const RUSSIA_BOUNDS: L.LatLngBoundsLiteral = [
  [40.2, 18.6],
  [82.85, 191.3],
]
const WORLD_SHIELDS: L.LatLngBoundsLiteral[] = [
  [[-85, -180], [85, 18.6]],
  [[-85, 191.3], [85, 360]],
  [[-85, 18.6], [40.2, 191.3]],
  [[82.85, 18.6], [85, 191.3]],
]
const MASK_FILL = { stroke: false, color: PAGE_BG, fillColor: PAGE_BG, fillOpacity: 1 } as const
const OBJECT_ZOOM = 11

type GeoFeature = { properties?: { code?: string; name?: string } }

function ClickToAdd({
  enabled,
  onPick,
  onMapClick,
}: {
  enabled: boolean
  onPick: (lat: number, lng: number) => void
  onMapClick?: (lat: number, lng: number, zoom: number) => void
}) {
  const map = useMap()
  useMapEvents({
    click(event) {
      if (enabled) onPick(event.latlng.lat, event.latlng.lng)
      else onMapClick?.(event.latlng.lat, event.latlng.lng, map.getZoom())
    },
  })
  return null
}

function ZoomBar() {
  const map = useMap()
  const [zoom, setZoom] = useState(() => map.getZoom())
  const [minZoom, setMinZoom] = useState(() => map.getMinZoom())
  const [host] = useState(() => L.DomUtil.create('div', 'zoom-bar'))

  useEffect(() => {
    const control = new L.Control({ position: 'bottomright' })
    control.onAdd = () => {
      L.DomEvent.disableClickPropagation(host)
      L.DomEvent.disableScrollPropagation(host)
      return host
    }
    map.addControl(control)
    const sync = () => {
      setZoom(map.getZoom())
      setMinZoom(map.getMinZoom())
    }
    map.on('zoom', sync)
    map.on('zoomend', sync)
    map.on('zoomlevelschange', sync)
    return () => {
      map.off('zoom', sync)
      map.off('zoomend', sync)
      map.off('zoomlevelschange', sync)
      map.removeControl(control)
    }
  }, [map, host])

  const maxZoom = map.getMaxZoom()

  return createPortal(
    <>
      <button type="button" aria-label="Приблизить" onClick={() => map.zoomIn(1)}>
        +
      </button>
      <input
        type="range"
        min={minZoom}
        max={maxZoom}
        step={0.05}
        value={Math.min(maxZoom, Math.max(minZoom, zoom))}
        aria-label="Масштаб"
        onChange={(event) => {
          const next = Number(event.target.value)
          setZoom(next)
          map.setZoom(next)
        }}
      />
      <button type="button" aria-label="Отдалить" onClick={() => map.zoomOut(1)}>
        −
      </button>
    </>,
    host,
  )
}

function FastTrackpadZoom() {
  const map = useMap()
  useEffect(() => {
    map.scrollWheelZoom.disable()
    const el = map.getContainer()
    let acc = 0
    let raf = 0
    let lastPoint: L.Point | null = null

    const flush = () => {
      raf = 0
      if (!acc) return
      const next = map.getZoom() + acc
      acc = 0
      const opts = { animate: false }
      if (lastPoint) {
        map.setZoomAround(map.containerPointToLatLng(lastPoint), next, opts)
      } else {
        map.setZoom(next, opts)
      }
    }

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      lastPoint = map.mouseEventToContainerPoint(event)
      const pinch = event.ctrlKey || event.metaKey
      const pixels = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaMode === 2 ? event.deltaY * 120 : event.deltaY
      const k = pinch ? 0.032 : 0.012
      acc = Math.max(-0.5, Math.min(0.5, acc - pixels * k))
      if (!raf) raf = requestAnimationFrame(flush)
    }

    let startZoom = map.getZoom()
    const onGestureStart = (event: Event) => {
      event.preventDefault()
      startZoom = map.getZoom()
    }
    const onGestureChange = (event: Event) => {
      event.preventDefault()
      const scale = (event as Event & { scale: number }).scale || 1
      map.setZoom(startZoom + Math.log2(scale) * 2.6, { animate: false })
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('gesturestart', onGestureStart, { passive: false })
    el.addEventListener('gesturechange', onGestureChange, { passive: false })
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('gesturestart', onGestureStart)
      el.removeEventListener('gesturechange', onGestureChange)
      if (raf) cancelAnimationFrame(raf)
      map.scrollWheelZoom.enable()
    }
  }, [map])
  return null
}

function HereBalloon({
  lat,
  lng,
  loading,
  items,
  address,
  onClose,
}: {
  lat: number
  lng: number
  loading: boolean
  items: HereItem[]
  address?: string
  onClose: () => void
}) {
  const map = useMap()
  const host = map.getContainer().parentElement
  const [pos, setPos] = useState(() => map.latLngToContainerPoint([lat, lng]))

  useEffect(() => {
    const update = () => setPos(map.latLngToContainerPoint([lat, lng]))
    update()
    map.on('move zoom zoomend viewreset', update)
    return () => {
      map.off('move zoom zoomend viewreset', update)
    }
  }, [map, lat, lng])

  const main = items[0]
  const rest = items.slice(1)
  const showAddress = address && address !== main?.name && address !== main?.description

  if (!host) return null
  return createPortal(
    <div
      className="here-balloon"
      style={{ left: pos.x, top: pos.y - 8 }}
      onClick={(event) => event.stopPropagation()}
    >
      <button className="place-balloon-close" type="button" aria-label="Закрыть" onClick={onClose}>
        ×
      </button>
      {loading ? (
        <p className="muted" style={{ margin: 0, fontSize: 12 }}>Ищу, что здесь…</p>
      ) : !main && !address ? (
        <p className="muted" style={{ margin: 0, fontSize: 12 }}>Ничего рядом не нашла. Приблизь карту.</p>
      ) : (
        <>
          {main && (
            <div className="here-main">
              <strong>{main.name}</strong>
              {(main.kind || main.distance != null) && (
                <span className="muted">
                  {[main.kind, main.distance != null ? `${Math.max(1, Math.round(main.distance))} м` : '']
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              )}
            </div>
          )}
          {showAddress && <p className="muted here-address">{address}</p>}
          {rest.length > 0 && (
            <ul className="here-list">
              {rest.map((item) => (
                <li key={item.name}>
                  <strong>{item.name}</strong>
                  {item.kind && <span className="muted">{item.kind}</span>}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      <a
        className="here-yandex"
        href={`https://yandex.ru/maps/?ll=${lng},${lat}&z=17&pt=${lng},${lat}&l=map`}
        target="_blank"
        rel="noreferrer"
      >
        Открыть в Яндекс.Картах
      </a>
    </div>,
    host,
  )
}

function FlyToPlace({ place }: { place?: Place }) {
  const map = useMap()
  useEffect(() => {
    if (!place) return
    map.flyTo([place.lat, place.lng], Math.max(map.getZoom(), 13), { duration: 0.55 })
  }, [map, place?.id, place?.lat, place?.lng])
  return null
}

function PlaceBalloon({
  place,
  photos,
  readOnly,
  onReload,
  onError,
  onClose,
}: {
  place: Place
  photos: Photo[]
  readOnly: boolean
  onReload: () => Promise<void>
  onError: (message: string) => void
  onClose: () => void
}) {
  const map = useMap()
  const host = map.getContainer().parentElement
  const [pos, setPos] = useState(() => map.latLngToContainerPoint([place.lat, place.lng]))

  useEffect(() => {
    const update = () => setPos(map.latLngToContainerPoint([place.lat, place.lng]))
    update()
    map.on('move zoom zoomend viewreset', update)
    return () => {
      map.off('move zoom zoomend viewreset', update)
    }
  }, [map, place.lat, place.lng])

  if (!host) return null
  return createPortal(
    <div
      className="place-balloon"
      style={{ left: pos.x, top: pos.y - 8 }}
      onClick={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
      <button className="place-balloon-close" type="button" aria-label="Закрыть" onClick={onClose}>
        ×
      </button>
      <PlacePopup
        place={place}
        photos={photos}
        readOnly={readOnly}
        onReload={onReload}
        onError={onError}
      />
    </div>,
    host,
  )
}

function FitMap({ geo }: { geo: object }) {
  const map = useMap()

  useEffect(() => {
    let settled = false
    const apply = () => {
      map.invalidateSize()
      const size = map.getSize()
      if (size.x < 80 || size.y < 80) return
      const bounds = L.geoJSON(geo as never).getBounds().pad(0.02)
      if (!bounds.isValid()) return
      map.setMinZoom(2)
      map.setMaxBounds(bounds)
      map.fitBounds(bounds, { animate: false, padding: [24, 24] })
      const zoom = map.getZoom()
      if (Number.isFinite(zoom)) map.setMinZoom(zoom)
    }

    apply()
    const t1 = window.setTimeout(apply, 50)
    const t2 = window.setTimeout(() => {
      apply()
      settled = true
    }, 300)
    const observer = new ResizeObserver(() => {
      map.invalidateSize()
      if (!settled) apply()
    })
    observer.observe(map.getContainer())
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      observer.disconnect()
    }
  }, [geo, map])
  return null
}

function MapFocus({
  geo,
  regions,
  places,
  onRegion,
  onPlace,
}: {
  geo: object | null
  regions: Region[]
  places: Place[]
  onRegion: (code: string) => void
  onPlace: (id: string) => void
}) {
  const map = useMap()
  const [params, setParams] = useSearchParams()
  const onRegionRef = useRef(onRegion)
  const onPlaceRef = useRef(onPlace)
  onRegionRef.current = onRegion
  onPlaceRef.current = onPlace

  useEffect(() => {
    const placeId = params.get('place')
    const regionCode = params.get('region')
    if (!placeId && !regionCode) return

    const run = () => {
      if (placeId) {
        const place = places.find((item) => item.id === placeId)
        if (!place) return false
        onPlaceRef.current(place.id)
        map.flyTo([place.lat, place.lng], 13, { duration: 0.7 })
        return true
      }
      if (regionCode && geo) {
        const feature = (geo as { features?: GeoFeature[] }).features?.find(
          (item) => regionCodeFromFeature(item.properties, regions) === regionCode,
        )
        if (!feature) return false
        onRegionRef.current(regionCode)
        const bounds = L.geoJSON(feature as never).getBounds()
        if (bounds.isValid()) {
          map.fitBounds(bounds.pad(0.08), { padding: [40, 40], maxZoom: 7, animate: true })
        }
        return true
      }
      return false
    }

    if (run()) {
      setParams({}, { replace: true })
      return
    }
    const timer = window.setTimeout(() => {
      if (run()) setParams({}, { replace: true })
    }, 400)
    return () => window.clearTimeout(timer)
  }, [geo, map, params, places, regions, setParams])

  return null
}

export function MapPage() {
  const { userId } = useParams()
  const { user } = useAuth()
  const friendId = userId && userId !== user?.id ? userId : undefined
  const readOnly = Boolean(friendId)
  const [regions, setRegions] = useState<Region[]>([])
  const [places, setPlaces] = useState<Place[]>([])
  const [stories, setStories] = useState<Story[]>([])
  const [photos, setPhotos] = useState<Photo[]>([])
  const [geo, setGeo] = useState<object | null>(null)
  const [mask, setMask] = useState<object | null>(null)
  const [selectedCode, setSelectedCode] = useState<string>()
  const [error, setError] = useState('')
  const [addingPlace, setAddingPlace] = useState(false)
  const addingPlaceRef = useRef(false)
  addingPlaceRef.current = addingPlace
  const clickTimer = useRef<number>(0)
  const [here, setHere] = useState<{ lat: number; lng: number; loading: boolean; items: HereItem[]; address?: string } | null>(null)
  const [formPos, setFormPos] = useState<{ left: number; top: number } | null>(null)
  const formDrag = useRef<{ grabX: number; grabY: number; parentLeft: number; parentTop: number } | null>(null)
  const [openPlaceId, setOpenPlaceId] = useState<string>()
  const [draft, setDraft] = useState({ title: '', description: '', lat: 0, lng: 0, file: undefined as File | undefined })

  async function reload() {
    if (friendId) {
      const [nextRegions, nextPlaces, nextStories, nextPhotos] = await Promise.all([
        api.personRegions(friendId),
        api.personPlaces(friendId),
        api.personStories(friendId),
        api.personPhotos(friendId),
      ])
      setRegions(nextRegions)
      setPlaces(nextPlaces)
      setStories(nextStories)
      setPhotos(nextPhotos)
      return
    }
    const [nextRegions, nextPlaces, nextStories, nextPhotos] = await Promise.all([
      api.regions(),
      api.places(),
      api.stories(),
      api.photos(),
    ])
    setRegions(nextRegions)
    setPlaces(nextPlaces)
    setStories(nextStories)
    setPhotos(nextPhotos)
  }

  useEffect(() => {
    reload().catch((err) => setError(err instanceof Error ? err.message : 'Ошибка загрузки'))
  }, [friendId])

  useEffect(() => {
    Promise.all([
      fetch('/russia-regions.json?v=4').then((r) => r.json()),
      fetch('/russia-mask.json?v=3').then((r) => r.json()),
    ])
      .then(([nextGeo, nextMask]) => {
        setGeo(nextGeo)
        setMask(nextMask)
      })
      .catch(() => setError('Не удалось загрузить контуры регионов'))
  }, [])

  const byCode = useMemo(() => new Map(regions.map((region) => [region.code, region])), [regions])
  const selected = selectedCode ? byCode.get(selectedCode) : undefined
  const openPlace = openPlaceId ? places.find((place) => place.id === openPlaceId) : undefined

  function inspectPoint(lat: number, lng: number, zoom = 16) {
    setOpenPlaceId(undefined)
    setSelectedCode(undefined)
    setHere({ lat, lng, loading: true, items: [], address: undefined })
    lookupHere(lat, lng, zoom)
      .then((result) => {
        setHere((current) =>
          current && current.lat === lat && current.lng === lng
            ? { lat, lng, loading: false, items: result.items, address: result.address }
            : current,
        )
      })
      .catch(() => {
        setHere((current) =>
          current && current.lat === lat && current.lng === lng ? { lat, lng, loading: false, items: [] } : current,
        )
      })
  }

  function styleFor(feature?: GeoFeature) {
    const code = regionCodeFromFeature(feature?.properties, regions)
    const region = code ? byCode.get(code) : undefined
    const visited = Boolean(region?.visited)
    const isSelected = selectedCode && selectedCode === code
    const fill = normalizeMapColor(region?.color)
    const stroke = strokeFromFill(fill)
    return {
      color: isSelected ? stroke : visited ? stroke : '#64748b',
      weight: isSelected ? 2.8 : 1,
      fillColor: visited || isSelected ? fill : '#ffffff',
      fillOpacity: visited ? 0.46 : isSelected ? 0.18 : 0.03,
    }
  }

  async function savePlace(event: FormEvent) {
    event.preventDefault()
    setError('')
    try {
      const created = await api.createPlace({
        title: draft.title,
        description: draft.description,
        lat: draft.lat,
        lng: draft.lng,
        regionId: selected?.id ?? null,
      })
      if (draft.file) await api.uploadMedia([draft.file], { placeId: created.id })
      setAddingPlace(false)
      setDraft({ title: '', description: '', lat: 0, lng: 0, file: undefined })
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не получилось сохранить точку')
    }
  }

  return (
    <div className="map-page">
      <MapContainer
        key={YANDEX_KEY ? 'yandex-3857' : 'carto'}
        center={[64, 100]}
        zoom={3}
        minZoom={3}
        maxZoom={18}
        zoomSnap={0}
        zoomDelta={1}
        wheelPxPerZoomLevel={40}
        zoomControl={false}
        style={{ height: '100%', width: '100%' }}
        maxBounds={RUSSIA_BOUNDS}
        maxBoundsViscosity={1}
        doubleClickZoom={false}
      >
        <ZoomBar />
        <FastTrackpadZoom />
        <TileLayer
          noWrap
          bounds={RUSSIA_BOUNDS}
          attribution={YANDEX_KEY ? '&copy; <a href="https://yandex.ru/maps">Яндекс</a>' : '&copy; OpenStreetMap &copy; CARTO'}
          url={YANDEX_TILES}
          maxZoom={19}
          maxNativeZoom={19}
        />
        {WORLD_SHIELDS.map((bounds, index) => (
          <Rectangle key={index} bounds={bounds} interactive={false} pathOptions={MASK_FILL} />
        ))}
        {mask && (
          <GeoJSON data={mask as never} interactive={false} style={MASK_FILL} />
        )}
        {geo && <FitMap geo={geo} />}
        <MapFocus
          geo={geo}
          regions={regions}
          places={places}
          onRegion={(code) => {
            setHere(null)
            setOpenPlaceId(undefined)
            setSelectedCode(code)
          }}
          onPlace={(id) => {
            setHere(null)
            setSelectedCode(undefined)
            setOpenPlaceId(id)
          }}
        />
        {geo && regions.length > 0 && (
          <GeoJSON
            key={`${selectedCode}:${regions.map((r) => `${r.code}:${r.visited}:${r.color ?? ''}`).join('|')}`}
            data={geo as never}
            style={(feature) => styleFor(feature as GeoFeature)}
            onEachFeature={(feature, layer) => {
              const code = regionCodeFromFeature((feature as GeoFeature).properties, regions)
              const path = layer as L.Path
              path.on({
                mouseover: () => {
                  path.setStyle({ weight: 2.4, fillOpacity: 0.22 })
                },
                mouseout: () => {
                  path.setStyle(styleFor(feature as GeoFeature))
                },
                click: (event) => {
                  L.DomEvent.stop(event.originalEvent)
                  if (addingPlaceRef.current) {
                    setDraft((current) => ({ ...current, lat: event.latlng.lat, lng: event.latlng.lng }))
                    return
                  }
                  window.clearTimeout(clickTimer.current)
                  const zoom = (path as L.Path & { _map?: L.Map })._map?.getZoom() ?? 16
                  if (zoom < OBJECT_ZOOM) {
                    if (code) {
                      setHere(null)
                      setOpenPlaceId(undefined)
                      setSelectedCode(code)
                    }
                    return
                  }
                  clickTimer.current = window.setTimeout(() => {
                    inspectPoint(event.latlng.lat, event.latlng.lng, zoom)
                  }, 280)
                },
                dblclick: (event) => {
                  L.DomEvent.stop(event.originalEvent)
                  window.clearTimeout(clickTimer.current)
                  if (code) setSelectedCode(code)
                },
              })
            }}
          />
        )}
        {places.map((place) => (
          <Marker
            key={place.id}
            position={[place.lat, place.lng]}
            icon={placeIcon}
            eventHandlers={{
              click: (event) => {
                L.DomEvent.stop(event.originalEvent)
                setOpenPlaceId(place.id)
              },
            }}
          />
        ))}
        <FlyToPlace place={openPlace} />
        {openPlace && (
          <PlaceBalloon
            place={openPlace}
            photos={photos}
            readOnly={readOnly}
            onReload={reload}
            onError={setError}
            onClose={() => setOpenPlaceId(undefined)}
          />
        )}
        {here && (
          <HereBalloon
            lat={here.lat}
            lng={here.lng}
            loading={here.loading}
            items={here.items}
            address={here.address}
            onClose={() => setHere(null)}
          />
        )}
        <ClickToAdd
          enabled={addingPlace && !readOnly}
          onPick={(lat, lng) => setDraft((current) => ({ ...current, lat, lng }))}
          onMapClick={(lat, lng, zoom) => {
            setOpenPlaceId(undefined)
            if (!addingPlace && zoom >= OBJECT_ZOOM) inspectPoint(lat, lng, zoom)
          }}
        />
      </MapContainer>

      {selected && !addingPlace && (
        <RegionSheet
          region={selected}
          stories={stories}
          photos={photos}
          places={places}
          error={error}
          onClose={() => setSelectedCode(undefined)}
          onReload={reload}
          onAddPlace={() => {
            setFormPos(null)
            setAddingPlace(true)
          }}
          onOpenPlace={(place) => {
            setHere(null)
            setSelectedCode(undefined)
            setOpenPlaceId(place.id)
          }}
          storyHref={(story) => (friendId ? `/people/${friendId}?open=${story.id}` : `/stories?open=${story.id}`)}
          readOnly={readOnly}
        />
      )}

      {addingPlace && !readOnly && (
        <form
          onSubmit={savePlace}
          className="place-form"
          style={formPos ? { left: formPos.left, top: formPos.top, right: 'auto', bottom: 'auto' } : undefined}
        >
          <div className="place-form-head">
          <div
            className="place-form-drag"
            onPointerDown={(event: ReactPointerEvent<HTMLDivElement>) => {
              const form = event.currentTarget.closest('.place-form') as HTMLElement | null
              const parent = form?.offsetParent as HTMLElement | null
              if (!form || !parent) return
              const formRect = form.getBoundingClientRect()
              const parentRect = parent.getBoundingClientRect()
              formDrag.current = {
                grabX: event.clientX - formRect.left,
                grabY: event.clientY - formRect.top,
                parentLeft: parentRect.left,
                parentTop: parentRect.top,
              }
              event.currentTarget.setPointerCapture(event.pointerId)
            }}
            onPointerMove={(event: ReactPointerEvent<HTMLDivElement>) => {
              const start = formDrag.current
              if (!start || !event.currentTarget.hasPointerCapture(event.pointerId)) return
              setFormPos({
                left: event.clientX - start.parentLeft - start.grabX,
                top: event.clientY - start.parentTop - start.grabY,
              })
            }}
            onPointerUp={(event: ReactPointerEvent<HTMLDivElement>) => {
              formDrag.current = null
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId)
              }
            }}
          >
            {draft.lat ? 'Точка выбрана' : 'Кликни точку на карте'}
          </div>
          <button className="icon-btn" type="button" onClick={() => setAddingPlace(false)} aria-label="Отмена">
            ✕
          </button>
          </div>
          <p className={`place-form-coords${draft.lat ? ' set' : ''}`}>
            {draft.lat
              ? `${draft.lat.toFixed(5)}, ${draft.lng.toFixed(5)}`
              : 'Координаты ещё не выбраны'}
          </p>
          <input
            className="input"
            placeholder="Название"
            value={draft.title}
            maxLength={25}
            onChange={(e) => setDraft({ ...draft, title: e.target.value.slice(0, 25) })}
            required
          />
          <input
            className="input place-form-note"
            placeholder="Заметка"
            value={draft.description}
            maxLength={500}
            onChange={(e) => setDraft({ ...draft, description: e.target.value.slice(0, 500) })}
          />
          <div className="place-form-row">
            <label className={`place-form-photo${draft.file ? ' has-file' : ''}`}>
              {draft.file ? '✓ фото' : 'Фото'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                hidden
                onChange={(e) => setDraft({ ...draft, file: e.target.files?.[0] })}
              />
            </label>
            <button className="btn teal" type="submit" disabled={!draft.lat}>Сохранить</button>
          </div>
        </form>
      )}
    </div>
  )
}
