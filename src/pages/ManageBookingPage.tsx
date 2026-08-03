import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  findBookingForManagement,
  clientCancelBooking,
  clientRescheduleBooking,
  ManageBookingError,
  type ManagedBooking,
} from '../lib/manageBooking'
import { groupConsecutiveSlots, type SlotGroup } from '../lib/booking'
import { useDateAvailability } from '../hooks/useDateAvailability'
import { useDaySlots } from '../hooks/useDaySlots'
import { formatDateFull, formatDateLabel, formatRub, formatTimeRange, todayISO } from '../lib/format'
import { DateStrip } from '../components/booking/DateStrip'
import { SlotList } from '../components/booking/SlotList'
import { PrimaryButton } from '../components/ui/PrimaryButton'
import { ConfirmProvider, useConfirm } from '../components/admin/ConfirmDialog'

const inputClass =
  'mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 font-body text-blue-deep outline-none transition-colors focus:border-blue-primary'
const labelClass = 'block font-body text-sm font-medium text-blue-deep'

const STATUS_LABEL: Record<string, string> = {
  pending_payment: 'Ожидает оплаты',
  confirmed: 'Подтверждена',
  cancelled: 'Отменена',
  completed: 'Завершена',
}

function RescheduleFlow({
  booking,
  code,
  email,
  onDone,
  onCancel,
}: {
  booking: ManagedBooking
  code: string
  email: string
  onDone: (result: ManagedBooking) => void
  onCancel: () => void
}) {
  const [selectedDate, setSelectedDate] = useState(todayISO())
  const [submitting, setSubmitting] = useState(false)
  const { availableDates, loading: datesLoading } = useDateAvailability(30)
  const { slots: daySlots, loading: slotsLoading } = useDaySlots(selectedDate)

  const groups = useMemo(
    () => groupConsecutiveSlots(daySlots, booking.durationHours),
    [daySlots, booking.durationHours],
  )

  async function handleSelect(group: SlotGroup) {
    setSubmitting(true)
    try {
      const result = await clientRescheduleBooking(
        code,
        email,
        group.slots.map((s) => s.id),
      )
      toast.success('Бронь перенесена')
      onDone({
        ...booking,
        slotDate: result.slotDate,
        startTime: result.startTime,
        endTime: result.endTime,
      })
    } catch (err) {
      toast.error(err instanceof ManageBookingError ? err.message : 'Не удалось перенести бронь')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 text-left">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-semibold text-blue-deep">
          Выберите новое время ({booking.durationHours} ч)
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="font-body text-sm text-blue-deep/50 hover:text-coral"
        >
          Отмена
        </button>
      </div>

      <DateStrip
        selected={selectedDate}
        onSelect={setSelectedDate}
        availableDates={availableDates}
        loading={datesLoading}
      />
      <p className="font-body text-sm text-blue-deep/70">{formatDateLabel(selectedDate)}</p>

      <SlotList groups={groups} onSelect={handleSelect} loading={slotsLoading} disabled={submitting} />
      {!slotsLoading && groups.length === 0 && (
        <p className="font-body text-sm text-blue-deep/50">На эту дату нет свободных интервалов.</p>
      )}
    </div>
  )
}

function ManageBookingInner() {
  const confirm = useConfirm()
  const [code, setCode] = useState('')
  const [email, setEmail] = useState('')
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [booking, setBooking] = useState<ManagedBooking | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [rescheduling, setRescheduling] = useState(false)

  async function handleSearch(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBooking(null)

    if (!code.trim() || !email.trim()) {
      setError('Заполните код брони и email')
      return
    }

    setSearching(true)
    try {
      const found = await findBookingForManagement(code, email)
      if (!found) {
        setError('Бронь не найдена. Проверьте код и email, указанные при бронировании.')
        return
      }
      setBooking(found)
    } catch (err) {
      setError(err instanceof ManageBookingError ? err.message : 'Не удалось найти бронь.')
    } finally {
      setSearching(false)
    }
  }

  async function handleCancel() {
    if (!booking) return
    const ok = await confirm({
      title: 'Отменить бронь?',
      message: `Бронь ${booking.bookingCode} будет отменена. Сумма возврата зависит от того, сколько времени остаётся до начала брони.`,
      confirmLabel: 'Отменить бронь',
      danger: true,
    })
    if (!ok) return

    setCancelling(true)
    try {
      await clientCancelBooking(code, email)
      toast.success('Бронь отменена')
      setBooking({ ...booking, status: 'cancelled' })
    } catch (err) {
      toast.error(err instanceof ManageBookingError ? err.message : 'Не удалось отменить бронь')
    } finally {
      setCancelling(false)
    }
  }

  const canReschedule =
    booking?.status === 'confirmed' &&
    booking.startAt &&
    new Date(booking.startAt).getTime() - Date.now() >= 24 * 60 * 60 * 1000

  return (
    <section className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <h1 className="text-center font-display text-3xl font-semibold text-blue-deep">
        Управление бронью
      </h1>
      <p className="mt-3 text-center font-body text-blue-deep/70">
        Укажите код брони и email, указанный при бронировании, чтобы отменить или перенести время.
      </p>

      <form onSubmit={handleSearch} className="mt-8 flex flex-col gap-4">
        <div>
          <label className={labelClass} htmlFor="code">
            Код брони
          </label>
          <input
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="OTR-XXXXXX"
            className={`${inputClass} uppercase`}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>

        {error && <p className="font-body text-sm text-coral">{error}</p>}

        <PrimaryButton type="submit" disabled={searching}>
          {searching ? 'Ищем…' : 'Найти бронь'}
        </PrimaryButton>
      </form>

      {booking && (
        <div className="mt-8 rounded-2xl border border-border bg-surface p-5 text-left">
          <div className="flex items-center justify-between">
            <span className="font-mono text-sm font-semibold text-blue-deep">
              {booking.bookingCode}
            </span>
            <span className="rounded-full bg-border px-2 py-0.5 font-body text-xs text-blue-deep/70">
              {STATUS_LABEL[booking.status] ?? booking.status}
            </span>
          </div>

          <div className="mt-3 flex flex-col gap-1 font-body text-sm text-blue-deep/80">
            <p>
              {booking.slotDate && booking.startTime && booking.endTime
                ? `${formatDateFull(booking.slotDate)} · ${formatTimeRange(booking.startTime, booking.endTime)}`
                : '—'}
            </p>
            <p>Фон: {booking.backgroundName ?? '—'}</p>
            <p className="font-mono">{formatRub(booking.totalPriceKopecks)}</p>
          </div>

          {booking.status === 'confirmed' && !rescheduling && (
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={cancelling}
                onClick={handleCancel}
                className="rounded-full border border-coral px-4 py-2 font-body text-sm text-coral transition-colors hover:bg-coral hover:text-white disabled:opacity-50"
              >
                {cancelling ? 'Отменяем…' : 'Отменить бронь'}
              </button>
              {canReschedule ? (
                <button
                  type="button"
                  onClick={() => setRescheduling(true)}
                  className="rounded-full border border-blue-primary px-4 py-2 font-body text-sm text-blue-primary transition-colors hover:bg-blue-primary hover:text-white"
                >
                  Перенести бронь
                </button>
              ) : (
                <p className="font-body text-xs text-blue-deep/50">
                  Самостоятельный перенос доступен не позднее чем за 24 часа до начала брони.
                  Позже — напишите нам напрямую.
                </p>
              )}
            </div>
          )}

          {booking.status === 'confirmed' && rescheduling && (
            <RescheduleFlow
              booking={booking}
              code={code}
              email={email}
              onCancel={() => setRescheduling(false)}
              onDone={(updated) => {
                setBooking(updated)
                setRescheduling(false)
              }}
            />
          )}

          {booking.status !== 'confirmed' && (
            <p className="mt-4 font-body text-sm text-blue-deep/50">
              Самостоятельные изменения доступны только для подтверждённых броней.
            </p>
          )}
        </div>
      )}

      <Link
        to="/"
        className="mt-8 inline-block font-body text-sm text-blue-primary hover:underline"
      >
        На главную
      </Link>
    </section>
  )
}

export function ManageBookingPage() {
  return (
    <ConfirmProvider>
      <ManageBookingInner />
    </ConfirmProvider>
  )
}
