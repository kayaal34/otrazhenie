import { formatTimeRange } from '../../lib/format'
import type { SlotGroup } from '../../lib/booking'

type SlotListProps = {
  groups: SlotGroup[]
  onSelect: (group: SlotGroup) => void
  loading: boolean
  disabled?: boolean
}

export function SlotList({ groups, onSelect, loading, disabled }: SlotListProps) {
  if (loading) {
    return <p className="font-body text-sm text-blue-deep/50">Загружаем слоты…</p>
  }

  if (groups.length === 0) {
    return null
  }

  return (
    <div className="flex flex-col gap-2">
      {groups.map((group) => (
        <button
          key={group.start.id}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(group)}
          className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 font-mono text-base text-blue-deep transition-colors hover:border-blue-primary disabled:opacity-50"
        >
          {formatTimeRange(group.start.start_time, group.slots[group.slots.length - 1].end_time)}
          <span className="font-body text-sm text-blue-primary">Выбрать →</span>
        </button>
      ))}
    </div>
  )
}
