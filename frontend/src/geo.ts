import type { Region } from './types'

type FeatureProps = {
  code?: string
  name?: string
}

type GeoGeometry = {
  type?: string
  coordinates?: unknown
}

type GeoFeature = {
  properties?: FeatureProps
  geometry?: GeoGeometry
}

export function regionCodeFromFeature(props: FeatureProps | undefined, regions: Region[]) {
  const code = props?.code
  if (code && regions.some((region) => region.code === code)) return code
  return null
}

export function regionCodeAtPoint(lat: number, lng: number, geo: object | null, regions: Region[]) {
  const features = (geo as { features?: GeoFeature[] } | null)?.features
  if (!features?.length) return undefined
  for (const feature of features) {
    const code = regionCodeFromFeature(feature.properties, regions)
    if (!code || !feature.geometry) continue
    if (geometryContains(feature.geometry, lng, lat)) return code
  }
  return undefined
}

function geometryContains(geometry: GeoGeometry, lng: number, lat: number) {
  const type = geometry.type
  const coords = geometry.coordinates
  if (type === 'Polygon') return polygonContains(coords as number[][][], lng, lat)
  if (type === 'MultiPolygon') {
    return (coords as number[][][][]).some((polygon) => polygonContains(polygon, lng, lat))
  }
  return false
}

function polygonContains(rings: number[][][], lng: number, lat: number) {
  if (!rings[0] || !ringContains(rings[0], lng, lat)) return false
  for (let i = 1; i < rings.length; i++) {
    if (ringContains(rings[i], lng, lat)) return false
  }
  return true
}

function ringContains(ring: number[][], lng: number, lat: number) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i]?.[0]
    const yi = ring[i]?.[1]
    const xj = ring[j]?.[0]
    const yj = ring[j]?.[1]
    if (xi == null || yi == null || xj == null || yj == null) continue
    const crosses = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    if (crosses) inside = !inside
  }
  return inside
}
