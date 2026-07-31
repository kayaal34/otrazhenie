import { useMemo } from 'react'
import { addDaysISO, todayISO, formatDayShort } from '../../lib/format'

type DateStripProps = {
  selected: string
  onSelect: (date: string) => void
  availableDates: Set<string>
  loading: boolean
  days?: number
}

export function DateStrip({ selected, onSelect, availableDates, loading, days = 21 }: DateStripProps) {
  const dates = useMemo(() => {
    const start = todayISO()
    return Array.from({ length: days }, (_, i) => addDaysISO(start, i))
  }, [days])

  return (
    <div
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0"
      role="tablist"
      aria-label="Выбор даты"
    >
      {dates.map((date) => {
        const isSelected = date === selected
        const dimmed = !loading && !availableDates.has(date)
        const { weekday, day } = formatDayShort(date)

        return (
          <button
            key={date}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onSelect(date)}
            className={`flex shrink-0 flex-col items-center rounded-2xl border px-4 py-2 font-body transition-colors ${
              isSelected
                ? 'border-blue-primary bg-blue-primary text-white'
                : dimmed
                  ? 'border-border bg-surface text-blue-deep/30'
                  : 'border-border bg-surface text-blue-deep hover:border-blue-primary'
            }`}
          >
            <span className="text-[11px] tracking-wide uppercase opacity-70">{weekday}</span>
            <span className="font-mono text-lg">{day}</span>
          </button>
        )
      })}
    </div>
  )
}
