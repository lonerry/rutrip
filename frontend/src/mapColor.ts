export const DEFAULT_MAP_COLOR = '#3b82f6'

export const MAP_COLORS = ['#3b82f6', '#f97316', '#e11d48', '#10b981', '#8b5cf6', '#0f172a']

export function normalizeMapColor(value?: string | null) {
  if (value && /^#[0-9A-Fa-f]{6}$/.test(value)) return value.toLowerCase()
  return DEFAULT_MAP_COLOR
}

export function strokeFromFill(hex: string) {
  const color = normalizeMapColor(hex).slice(1)
  const r = Math.round(parseInt(color.slice(0, 2), 16) * 0.62)
  const g = Math.round(parseInt(color.slice(2, 4), 16) * 0.62)
  const b = Math.round(parseInt(color.slice(4, 6), 16) * 0.62)
  const toHex = (n: number) => n.toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}
