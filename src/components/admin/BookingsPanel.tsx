import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  fetchBookingDetails,
  cancelBooking,
  confirmPayment,
  AdminError,
  type BookingDetailRow,
} from '../../lib/admin'
import { formatDateFull, formatRub, formatTimeRange } from '../../lib/format'

type Filter = 'upcoming' | 'past' | 'all'

const STATUS_LABEL: Record<BookingDetailRow['status'], string> = {
  pending_payment: 'Ожидает оплаты',
  confirmed: 'Подтверждена',
  cancelled: 'Отменена',
  completed: 'Завершена',
}

const STATUS_CLASS: Record<BookingDetailRow['status'], string> = {
  pending_payment: 'bg-amber/20 text-blue-deep',
  confirmed: 'bg-mint/15 text-mint',
  cancelled: 'bg-coral/15 text-coral',
  completed: 'bg-border text-blue-deep/60',
}

export function BookingsPanel() {
  const [bookings, setBookings] = useState<BookingDetailRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('upcoming')
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const data = await fetchBookingDetails()
      setBookings(data)
    } catch (err) {
      toast.error(err instanceof AdminError ? err.message : 'Не удалось загрузить брони')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    const now = Date.now()
    const byFilter = bookings.filter((b) => {
      if (filter === 'all') return true
      const startAt = b.start_at ? new Date(b.start_at).getTime() : 0
      return filter === 'upcoming' ? startAt >= now : startAt < now
    })
    // Брони, ожидающие оплаты, поднимаем наверх — их нужно замечать первыми
    return [...byFilter].sort((a, b) => {
      const rank = (x: BookingDetailRow) => (x.status === 'pending_payment' ? 0 : 1)
      return rank(a) - rank(b)
    })
  }, [bookings, filter])

  async function handleCancel(booking: BookingDetailRow) {
    setCancellingId(booking.id)
    try {
      await cancelBooking(booking.id)
      toast.success(`Бронь ${booking.booking_code} отменена`)
      await load()
    } catch (err) {
      toast.error(err instanceof AdminError ? err.message : 'Не удалось отменить бронь')
    } finally {
      setCancellingId(null)
    }
  }

  async function handleConfirmPayment(booking: BookingDetailRow) {
    setConfirmingId(booking.id)
    try {
      await confirmPayment(booking.id)
      toast.success(`Оплата брони ${booking.booking_code} подтверждена`)
      await load()
    } catch (err) {
      toast.error(err instanceof AdminError ? err.message : 'Не удалось подтвердить оплату')
    } finally {
      setConfirmingId(null)
    }
  }

  return (
    <div>
      <div className="flex gap-2">
        {(
          [
            { key: 'upcoming', label: 'Предстоящие' },
            { key: 'past', label: 'Прошедшие' },
            { key: 'all', label: 'Все' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            className={`rounded-full px-3 py-1.5 font-body text-sm transition-colors ${
              filter === tab.key
                ? 'bg-blue-primary text-white'
                : 'border border-border text-blue-deep/70 hover:border-blue-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-4 font-body text-sm text-blue-deep/50">Загружаем…</p>
      ) : filtered.length === 0 ? (
        <p className="mt-4 font-body text-sm text-blue-deep/50">Броней нет.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {filtered.map((b) => (
            <li key={b.id} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-sm font-semibold text-blue-deep">
                  {b.slot_date && b.start_time && b.end_time
                    ? `${formatDateFull(b.slot_date)} · ${formatTimeRange(b.start_time, b.end_time)}`
                    : '—'}
                </span>
                <span className={`rounded-full px-2 py-0.5 font-body text-xs ${STATUS_CLASS[b.status]}`}>
                  {STATUS_LABEL[b.status]}
                </span>
              </div>

              <div className="mt-2 grid gap-1 font-body text-sm text-blue-deep/80 sm:grid-cols-2">
                <p>{b.client_name}</p>
                <p>{b.client_phone}</p>
                <p>{b.client_email}</p>
                <p>Фон: {b.background_name ?? '—'}</p>
                <p>Человек: {b.guests_count}{b.with_pet ? ' · с питомцем 🐾' : ''}</p>
                <p className="font-mono">{formatRub(b.total_price_kopecks)}</p>
              </div>

              {(b.addon_kopecks > 0 || b.discount_kopecks > 0) && (
                <p className="mt-1 font-body text-xs text-blue-deep/50">
                  {b.addon_kopecks > 0 && <>Доп. фон: +{formatRub(b.addon_kopecks)} </>}
                  {b.discount_kopecks > 0 && (
                    <>
                      · Промокод {b.promo_code}: −{formatRub(b.discount_kopecks)}
                    </>
                  )}
                </p>
              )}

              {b.comment && (
                <p className="mt-2 font-body text-sm text-blue-deep/60 italic">«{b.comment}»</p>
              )}

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-xs text-blue-deep/40">{b.booking_code}</span>

                <div className="flex items-center gap-3">
                  {b.status === 'pending_payment' && (
                    <button
                      type="button"
                      disabled={confirmingId === b.id}
                      onClick={() => handleConfirmPayment(b)}
                      className="font-body text-xs text-mint hover:underline disabled:opacity-50"
                    >
                      {confirmingId === b.id ? 'Подтверждаем…' : 'Подтвердить оплату'}
                    </button>
                  )}

                  {(b.status === 'confirmed' || b.status === 'pending_payment') && (
                    <button
                      type="button"
                      disabled={cancellingId === b.id}
                      onClick={() => handleCancel(b)}
                      className="font-body text-xs text-coral hover:underline disabled:opacity-50"
                    >
                      {cancellingId === b.id ? 'Отменяем…' : 'Отменить бронь'}
                    </button>
                  )}

                  {b.status === 'cancelled' && b.refund_kopecks !== null && (
                    <span className="font-body text-xs text-blue-deep/50">
                      Возврат: {formatRub(b.refund_kopecks)}
                    </span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
