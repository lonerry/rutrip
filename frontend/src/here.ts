export type HereItem = {
  name: string
  description?: string
  kind?: string
  distance?: number
}

export type HereLookup = {
  items: HereItem[]
  address?: string
}

const KIND_RU: Record<string, string> = {
  cafe: 'кафе',
  restaurant: 'ресторан',
  fast_food: 'быстрое питание',
  bar: 'бар',
  pub: 'паб',
  bakery: 'пекарня',
  supermarket: 'супермаркет',
  convenience: 'магазин',
  clothes: 'одежда',
  mall: 'торговый центр',
  hotel: 'отель',
  hostel: 'хостел',
  guest_house: 'гостиница',
  museum: 'музей',
  attraction: 'достопримечательность',
  viewpoint: 'смотровая точка',
  theatre: 'театр',
  cinema: 'кинотеатр',
  arts_centre: 'культурный центр',
  park: 'парк',
  garden: 'сад',
  church: 'церковь',
  cathedral: 'собор',
  mosque: 'мечеть',
  synagogue: 'синагога',
  place_of_worship: 'храм',
  university: 'университет',
  school: 'школа',
  kindergarten: 'детский сад',
  hospital: 'больница',
  clinic: 'клиника',
  pharmacy: 'аптека',
  bank: 'банк',
  atm: 'банкомат',
  fuel: 'АЗС',
  parking: 'парковка',
  subway_entrance: 'вход в метро',
  station: 'станция',
  memorial: 'мемориал',
  monument: 'памятник',
  artwork: 'арт-объект',
  fountain: 'фонтан',
  building: 'здание',
  apartments: 'жилой дом',
  house: 'дом',
  commercial: 'здание',
  retail: 'здание',
  industrial: 'здание',
  yes: 'здание',
  pedestrian: 'улица',
  residential: 'улица',
  living_street: 'улица',
  primary: 'улица',
  secondary: 'улица',
  tertiary: 'улица',
  unclassified: 'улица',
  alcohol: 'магазин',
  gift: 'магазин',
  books: 'книжный',
  hairdresser: 'салон',
  beauty: 'салон',
  library: 'библиотека',
  townhall: 'администрация',
  government: 'учреждение',
}

export async function lookupHere(lat: number, lng: number, zoom = 16): Promise<HereLookup> {
  const [pois, geo] = await Promise.all([zoom >= 13 ? overpassNearby(lat, lng, zoom) : Promise.resolve([]), nominatim(lat, lng)])
  const items = unique([...pois, ...geo.items]).slice(0, 5)
  const address = geo.address && geo.address !== items[0]?.name ? geo.address : undefined
  return { items, address }
}

async function overpassNearby(lat: number, lng: number, zoom: number): Promise<HereItem[]> {
  const radius = zoom >= 17 ? 70 : zoom >= 15 ? 120 : 220
  const query = `[out:json][timeout:10];(${overpassFilters(radius, lat, lng)});out tags center 25;`
  try {
    const data = await overpass(query)
    const scored = (data?.elements ?? [])
      .map((element) => toPoi(element, lat, lng))
      .filter((item): item is HereItem & { score: number } => Boolean(item))
      .sort((a, b) => b.score - a.score)
    return scored.slice(0, 5).map(({ score: _score, ...item }) => item)
  } catch {
    return []
  }
}

function overpassFilters(radius: number, lat: number, lng: number) {
  const around = `(around:${radius},${lat},${lng})`
  return [
    `nwr${around}[name][amenity]`,
    `nwr${around}[name][shop]`,
    `nwr${around}[name][tourism]`,
    `nwr${around}[name][leisure]`,
    `nwr${around}[name][office]`,
    `nwr${around}[name][historic]`,
    `nwr${around}[name][craft]`,
    `nwr${around}[name][building]`,
    `way${around}[name][highway]`,
    `nwr${around}["addr:housenumber"]["addr:street"]`,
  ].join(';')
}

type OsmElement = {
  type?: string
  lat?: number
  lon?: number
  center?: { lat?: number; lon?: number }
  tags?: Record<string, string>
}

function toPoi(element: OsmElement, lat: number, lng: number) {
  const tags = element.tags ?? {}
  if (!isUseful(tags)) return null
  const poiLat = element.lat ?? element.center?.lat
  const poiLng = element.lon ?? element.center?.lon
  const name = objectName(tags)
  if (!name || looksLikeCoords(name)) return null
  const distance = poiLat != null && poiLng != null ? meters(lat, lng, poiLat, poiLng) : undefined
  const kind = kindLabel(tags)
  const score = typeScore(tags) - (distance ?? 80) / 10
  return { name, kind, distance, description: addressFromTags(tags), score }
}

function isUseful(tags: Record<string, string>) {
  if (tags.route === 'subway' || tags.route === 'train') return false
  if (tags.railway && !['station', 'halt', 'subway_entrance', 'tram_stop'].includes(tags.railway)) return false
  const name = tags['name:ru'] || tags.name || ''
  if (/^(вход|выход)\b/i.test(name)) return false
  return Boolean(name || (tags['addr:street'] && tags['addr:housenumber']))
}

function objectName(tags: Record<string, string>) {
  return (
    tags['name:ru'] ||
    tags.name ||
    (tags['addr:street'] && tags['addr:housenumber'] ? `${tags['addr:street']}, ${tags['addr:housenumber']}` : '')
  ).trim()
}

function addressFromTags(tags: Record<string, string>) {
  if (tags['addr:street'] && tags['addr:housenumber']) {
    return `${tags['addr:street']}, ${tags['addr:housenumber']}`
  }
  return undefined
}

function typeScore(tags: Record<string, string>) {
  if (tags.amenity || tags.shop || tags.tourism || tags.leisure || tags.historic || tags.craft) return 100
  if (tags.office || tags.building && tags.name) return 70
  if (tags['addr:housenumber']) return 40
  if (tags.highway) return 25
  return 10
}

function kindLabel(tags: Record<string, string>) {
  const raw =
    tags.amenity ||
    tags.shop ||
    tags.tourism ||
    tags.leisure ||
    tags.office ||
    tags.historic ||
    tags.craft ||
    tags.railway ||
    (tags.building && tags.building !== 'yes' ? tags.building : undefined) ||
    tags.highway
  if (!raw) return tags.building ? 'здание' : undefined
  return KIND_RU[raw] || raw.replace(/_/g, ' ')
}

async function nominatim(lat: number, lng: number): Promise<HereLookup> {
  try {
    const data = await fetchJson(
      `/nominatim/reverse?lat=${lat}&lon=${lng}&format=json&zoom=18&addressdetails=1&namedetails=1&accept-language=ru`,
    )
    const address = formatAddress(data?.address)
    const named = data?.namedetails?.['name:ru'] || data?.name
    const kind = data?.type ? KIND_RU[data.type] || String(data.type).replace(/_/g, ' ') : undefined
    const items: HereItem[] = []
    if (named && !looksLikeCoords(named) && data?.class !== 'place' && data?.class !== 'boundary') {
      items.push({ name: named, kind, description: address !== named ? address : undefined })
    }
    return { items, address }
  } catch {
    return { items: [] }
  }
}

function formatAddress(address?: Record<string, string>) {
  if (!address) return undefined
  const street = [address.road, address.house_number].filter(Boolean).join(', ')
  const place = address.city || address.town || address.village || address.suburb
  return [street || address.neighbourhood, place].filter(Boolean).join(', ') || undefined
}

function unique(items: HereItem[]) {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = item.name.trim().toLowerCase()
    if (!key || seen.has(key) || looksLikeCoords(key)) return false
    seen.add(key)
    return true
  })
}

function looksLikeCoords(name: string) {
  return /^-?\d{1,3}[.,]\d+\s*,\s*-?\d{1,3}[.,]\d+/.test(name.trim())
}

function meters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (value: number) => (value * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * 6371000 * Math.asin(Math.sqrt(a))
}

async function overpass(query: string) {
  const body = `data=${encodeURIComponent(query)}`
  try {
    return await postJson('https://overpass-api.de/api/interpreter', body)
  } catch {
    return await postJson('/overpass', body)
  }
}

async function postJson(url: string, body: string) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body,
  })
  if (!response.ok) throw new Error(String(response.status))
  return response.json()
}

async function fetchJson(url: string) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(String(response.status))
  return response.json()
}
