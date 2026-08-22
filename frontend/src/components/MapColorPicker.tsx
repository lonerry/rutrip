import { MAP_COLORS, normalizeMapColor } from '../mapColor'

export function MapColorPicker({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (color: string) => void
  disabled?: boolean
}) {
  const current = normalizeMapColor(value)
  return (
    <div className="color-picker">
      {MAP_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          className={`color-dot${current === color ? ' active' : ''}`}
          style={{ background: color }}
          aria-label={`Цвет ${color}`}
          disabled={disabled}
          onClick={() => onChange(color)}
        />
      ))}
      <label className="color-custom" title="Свой цвет">
        <input
          type="color"
          value={current}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    </div>
  )
}
