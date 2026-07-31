import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { fetchSlotRange, createSlotsBulk, deleteSlot, AdminError } from '../../lib/admin'
import type { SlotRow } from '../../lib/booking'
import { formatTimeRange, todayISO } from '../../lib/format'
import { PrimaryButton } from '../ui/PrimaryButton'

const STATUS_LABEL: Record<SlotRow['status'], string> = {
  available: 'Свободен',
  locked: 'Удержан',
  booked: 'Забронирован',
}

const STATUS_CLASS: Record<SlotRow['status'], string> = {
  available: 'bg-mint/15 text-mint',
  locked: 'bg-amber/20 text-blue-deep',
  booked: 'bg-coral/15 text-coral',
}

const inputClass =
  'mt-1 rounded-xl border border-border bg-surface px-3 py-2 font-body text-blue-deep outline-none transition-colors focus:border-blue-primary'

export function SlotsPanel() {
  const [viewDate, setViewDate] = useState(todayISO())
  const [slots, setSlots] = useState<SlotRow[]>([])
  const [loading, setLoading] = useState(true)

  const [dateFrom, setDateFrom] = useState(todayISO())
  const [dateTo, setDateTo] = useState(todayISO())
  const [startHour, setStartHour] = useState(10)
  const [endHour, setEndHour] = useState(20)
  const [creating, setCreating] = useState(false)

  async function loadDay(date: string) {
    setLoading(true)
    try {
      const data = await fetchSlotRange(date, date)
      setSlots(data)
    } catch (err) {
      toast.error(err instanceof AdminError ? err.message : 'Не удалось загрузить слоты')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDay(viewDate)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewDate])

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setCreating(true)
    try {
      const count = await createSlotsBulk(dateFrom, dateTo, startHour, endHour)
      toast.success(`Создано слотов: ${count}`)
      if (viewDate >= dateFrom && viewDate <= dateTo) {
        loadDay(viewDate)
      }
    } catch (err) {
      toast.error(err instanceof AdminError ? err.message : 'Не удалось создать слоты')
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(slot: SlotRow) {
    try {
      await deleteSlot(slot.id)
      setSlots((prev) => prev.filter((s) => s.id !== slot.id))
      toast.success('Слот удалён')
    } catch (err) {
      toast.error(err instanceof AdminError ? err.message : 'Не удалось удалить слот')
    }
  }

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h2 className="font-display text-lg font-semibold text-blue-deep">Открыть новые слоты</h2>
        <form onSubmit={handleCreate} className="mt-3 grid gap-3 sm:grid-cols-4">
          <label className="flex flex-col font-body text-sm text-blue-deep">
            С даты
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className={inputClass}
              required
            />
          </label>
          <label className="flex flex-col font-body text-sm text-blue-deep">
            По дату
            <input
              type="date"
              value={dateTo}
              min={dateFrom}
              onChange={(e) => setDateTo(e.target.value)}
              className={inputClass}
              required
            />
          </label>
          <label className="flex flex-col font-body text-sm text-blue-deep">
            Начало работы (час)
            <input
              type="number"
              min={0}
              max={23}
              value={startHour}
              onChange={(e) => setStartHour(Number(e.target.value))}
              className={inputClass}
              required
            />
          </label>
          <label className="flex flex-col font-body text-sm text-blue-deep">
            Окончание работы (час)
            <input
              type="number"
              min={1}
              max={24}
              value={endHour}
              onChange={(e) => setEndHour(Number(e.target.value))}
              className={inputClass}
              required
            />
          </label>
          <div className="sm:col-span-4">
            <PrimaryButton type="submit" size="sm" disabled={creating}>
              {creating ? 'Создаём…' : 'Создать слоты'}
            </PrimaryButton>
          </div>
        </form>
      </section>

      <section>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-blue-deep">Слоты по дням</h2>
          <input
            type="date"
            value={viewDate}
            onChange={(e) => setViewDate(e.target.value)}
            className={`${inputClass} mt-0 w-auto`}
          />
        </div>

        {loading ? (
          <p className="mt-3 font-body text-sm text-blue-deep/50">Загружаем…</p>
        ) : slots.length === 0 ? (
          <p className="mt-3 font-body text-sm text-blue-deep/50">На эту дату слотов нет.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {slots.map((slot) => (
              <li
                key={slot.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-2"
              >
                <span className="font-mono text-sm text-blue-deep">
                  {formatTimeRange(slot.start_time, slot.end_time)}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 font-body text-xs ${STATUS_CLASS[slot.status]}`}
                >
                  {STATUS_LABEL[slot.status]}
                </span>
                {slot.status === 'available' ? (
                  <button
                    type="button"
                    onClick={() => handleDelete(slot)}
                    className="font-body text-xs text-coral hover:underline"
                  >
                    Удалить
                  </button>
                ) : (
                  <span className="w-[52px]" aria-hidden />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
