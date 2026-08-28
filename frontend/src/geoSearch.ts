import type { GeoHit } from './types'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined
const YANDEX_KEY = import.meta.env.VITE_YANDEX_MAPS_KEY as string | undefined

type Near = { lat: number; lng: number }

function mergeHits(...lists: GeoHit[][]): GeoHit[] {
  const out: GeoHit[] = []
  const seen = new Set<string>()
  for (const list of lists) {
    for (const hit of list) {
      const key = `${hit.name.toLowerCase()}|${hit.lat.toFixed(3)}|${hit.lng.toFixed(3)}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push(hit)
      if (out.length >= 8) return out
    }
  }
  return out
}

export async function searchPlaces(
  q: string,
  near: Near | undefined,
  backendSearch: (q: string, near?: Near) => Promise<GeoHit[]>,
): Promise<GeoHit[]> {
  const mapboxP = mapboxSearch(q, near).catch(() => [] as GeoHit[])
  const backendP = backendSearch(q, near).catch(() => [] as GeoHit[])

  const yandex = await yandexSearch(q, near).catch(() => [] as GeoHit[])
  if (yandex.length) return yandex

  const backend = await backendP
  if (backend.length) return backend

  return mapboxP
}

async function mapboxSearch(q: string, near?: Near): Promise<GeoHit[]> {
  if (!MAPBOX_TOKEN) return []
  const params = new URLSearchParams({
    access_token: MAPBOX_TOKEN,
    language: 'ru',
    country: 'ru',
    limit: '7',
    types: 'poi,place,locality,neighborhood,address,region,district',
  })
  if (near) params.set('proximity', `${near.lng},${near.lat}`)
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?${params}`
  const response = await fetch(url)
  if (!response.ok) return []
  const data = (await response.json()) as { features?: unknown[] }
  if (!Array.isArray(data.features)) return []
  return data.features.map(fromMapbox).filter((hit): hit is GeoHit => hit !== null)
}

async function yandexSearch(q: string, near?: Near): Promise<GeoHit[]> {
  if (!YANDEX_KEY || !import.meta.env.DEV) return []
  const [places, geo] = await Promise.all([
    yandexGeosearch(q, near),
    yandexGeocode(q, near),
  ])
  return mergeHits(places, geo)
}

async function yandexGeosearch(q: string, near?: Near): Promise<GeoHit[]> {
  const params = new URLSearchParams({
    apikey: YANDEX_KEY as string,
    text: q,
    type: 'geo,biz',
    lang: 'ru_RU',
    results: '7',
  })
  if (near) params.set('ll', `${near.lng},${near.lat}`)
  const response = await fetch(`/yandex-search/v1/?${params}`)
  if (!response.ok) return []
  const data = (await response.json()) as { features?: unknown[] }
  if (!Array.isArray(data.features)) return []
  return data.features.map(fromYandexPlaces).filter((hit): hit is GeoHit => hit !== null)
}

async function yandexGeocode(q: string, near?: Near): Promise<GeoHit[]> {
  const params = new URLSearchParams({
    apikey: YANDEX_KEY as string,
    geocode: q,
    format: 'json',
    lang: 'ru_RU',
    results: '7',
  })
  if (near) params.set('ll', `${near.lng},${near.lat}`)
  const response = await fetch(`/yandex-geocode/1.x/?${params}`)
  if (!response.ok) return []
  const data = (await response.json()) as {
    response?: { GeoObjectCollection?: { featureMember?: unknown } }
  }
  const members = data.response?.GeoObjectCollection?.featureMember
  const list = Array.isArray(members) ? members : members ? [members] : []
  return list
    .map((member) => fromYandex((member as { GeoObject?: unknown }).GeoObject))
    .filter((hit): hit is GeoHit => hit !== null)
}

function fromMapbox(feature: unknown): GeoHit | null {
  const node = feature as {
    text?: string
    place_name?: string
    center?: number[]
    bbox?: number[]
    place_type?: string[]
  }
  const center = node.center
  if (!Array.isArray(center) || center.length < 2) return null
  const lng = Number(center[0])
  const lat = Number(center[1])
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  const name = (node.text || node.place_name || '').trim()
  if (!name) return null
  let description = (node.place_name || '').trim()
  if (description.startsWith(name)) description = description.slice(name.length).replace(/^,\s*/, '')
  if (description === name) description = ''
  const bbox = Array.isArray(node.bbox) && node.bbox.length >= 4
    ? [node.bbox[1], node.bbox[3], node.bbox[0], node.bbox[2]]
    : null
  const kind = node.place_type?.[0] || null
  return { name, description: description || null, lat, lng, bbox, kind }
}

function fromYandexPlaces(feature: unknown): GeoHit | null {
  const node = feature as {
    geometry?: { coordinates?: number[] }
    properties?: {
      name?: string
      description?: string
      boundedBy?: number[][]
      CompanyMetaData?: { name?: string; Categories?: { class?: string; name?: string }[] }
      GeocoderMetaData?: { kind?: string }
    }
  }
  const coords = node.geometry?.coordinates
  if (!Array.isArray(coords) || coords.length < 2) return null
  const lng = Number(coords[0])
  const lat = Number(coords[1])
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  const props = node.properties
  const name = (props?.name || props?.CompanyMetaData?.name || '').trim()
  if (!name) return null
  let description = (props?.description || '').trim()
  if (description === name) description = ''
  const category = props?.CompanyMetaData?.Categories?.[0]
  const kind = category?.class || category?.name || props?.GeocoderMetaData?.kind || null
  const box = props?.boundedBy
  const bbox = Array.isArray(box) && box.length >= 2 && box[0].length >= 2 && box[1].length >= 2
    ? [Number(box[0][1]), Number(box[1][1]), Number(box[0][0]), Number(box[1][0])]
    : null
  return {
    name,
    description: description || null,
    lat,
    lng,
    bbox: bbox?.every(Number.isFinite) ? bbox : null,
    kind,
  }
}

function fromYandex(obj: unknown): GeoHit | null {
  const node = obj as {
    name?: string
    description?: string
    Point?: { pos?: string }
    boundedBy?: { Envelope?: { lowerCorner?: string; upperCorner?: string } }
    metaDataProperty?: { GeocoderMetaData?: { kind?: string; text?: string } }
  }
  const pos = node?.Point?.pos?.trim().split(/\s+/) ?? []
  if (pos.length < 2) return null
  const lng = Number(pos[0])
  const lat = Number(pos[1])
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  const name = (node.name || node.metaDataProperty?.GeocoderMetaData?.text || '').trim()
  if (!name) return null
  let description = (node.description || '').trim()
  if (description === name) description = ''
  const kind = node.metaDataProperty?.GeocoderMetaData?.kind || null
  const lower = node.boundedBy?.Envelope?.lowerCorner?.trim().split(/\s+/) ?? []
  const upper = node.boundedBy?.Envelope?.upperCorner?.trim().split(/\s+/) ?? []
  const bbox = lower.length >= 2 && upper.length >= 2
    ? [Number(lower[1]), Number(upper[1]), Number(lower[0]), Number(upper[0])]
    : null
  return {
    name,
    description: description || null,
    lat,
    lng,
    bbox: bbox?.every(Number.isFinite) ? bbox : null,
    kind,
  }
}
