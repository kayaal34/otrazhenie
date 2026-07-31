import type { BackgroundRow } from '../../lib/booking'

type BackgroundPickerProps = {
  backgrounds: BackgroundRow[]
  value: string
  onChange: (id: string) => void
}

function swatchColor(name: string): string {
  const lower = name.toLowerCase()
  if (lower.includes('бел')) return '#ffffff'
  if (lower.includes('чёрн') || lower.includes('черн')) return '#111111'
  if (lower.includes('роз')) return '#f4a6c8'
  return '#cbd5e1'
}

export function BackgroundPicker({ backgrounds, value, onChange }: BackgroundPickerProps) {
  if (backgrounds.length === 0) {
    return (
      <p className="mt-1 font-body text-sm text-blue-deep/50">
        Фоны пока не добавлены — обратитесь к администратору студии.
      </p>
    )
  }

  return (
    <div className="mt-2 flex flex-wrap gap-3">
      {backgrounds.map((bg) => {
        const isSelected = bg.id === value
        return (
          <button
            key={bg.id}
            type="button"
            onClick={() => onChange(bg.id)}
            className={`flex items-center gap-2 rounded-full border-2 px-3 py-2 transition-colors ${
              isSelected ? 'border-blue-primary' : 'border-border hover:border-blue-primary/50'
            }`}
          >
            <span
              className="h-5 w-5 rounded-full border border-border"
              style={{ background: swatchColor(bg.name) }}
              aria-hidden
            />
            <span className="font-body text-sm text-blue-deep">{bg.name}</span>
          </button>
        )
      })}
    </div>
  )
}
