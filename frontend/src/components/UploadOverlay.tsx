export function UploadOverlay({
  show,
  label = 'Загружаю…',
  compact = false,
}: {
  show: boolean
  label?: string
  compact?: boolean
}) {
  if (!show) return null
  return (
    <div className={`upload-overlay${compact ? ' compact' : ''}`} role="status" aria-live="polite">
      <span className="upload-spinner" aria-hidden />
      {label && !compact ? <span>{label}</span> : <span className="sr-only">{label}</span>}
    </div>
  )
}
