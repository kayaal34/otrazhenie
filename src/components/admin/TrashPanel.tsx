import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  fetchTrashedBookings,
  restoreBooking,
  permanentlyDeleteBooking,
  emptyTrash,
  AdminError,
  type BookingDetailRow,
} from '../../lib/admin'
import { formatDateFull, formatDateTime, formatRub, formatTimeRange } from '../../lib/format'
import { useConfirm } from './ConfirmDialog'

const STATUS_LABEL: Record<BookingDetailRow['status'], string> = {
  pending_payment: 'Ожидает оплаты',
  confirmed: 'Подтверждена',
  cancelled: 'Отменена',
  completed: 'Завершена',
}

export function TrashPanel() {
  const confirm = useConfirm()
  const [bookings, setBookings] = useState<BookingDetailRow[]>([])
  const [loading, setLoading] = useState(true)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [emptying, setEmptying] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const data = await fetchTrashedBookings()
      setBookings(data)
    } catch (err) {
      toast.error(err instanceof AdminError ? err.message : 'Не удалось загрузить корзину')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleRestore(booking: BookingDetailRow) {
    setRestoringId(booking.id)
    try {
      await restoreBooking(booking.id)
      setBookings((prev) => prev.filter((b) => b.id !== booking.id))
      toast.success(`Бронь ${booking.booking_code} восстановлена`)
    } catch (err) {
      toast.error(err instanceof AdminError ? err.message : 'Не удалось восстановить бронь')
    } finally {
      setRestoringId(null)
    }
  }

  async function handleDeleteForever(booking: BookingDetailRow) {
    const ok = await confirm({
      title: 'Удалить бронь навсегда?',
      message: `Бронь ${booking.booking_code} (${booking.client_name}) будет стёрта безвозвратно. Восстановить её будет уже нельзя.`,
      confirmLabel: 'Удалить навсегда',
      danger: true,
    })
    if (!ok) return

    setDeletingId(booking.id)
    try {
      await permanentlyDeleteBooking(booking.id)
      setBookings((prev) => prev.filter((b) => b.id !== booking.id))
      toast.success(`Бронь ${booking.booking_code} удалена навсегда`)
    } catch (err) {
      toast.error(err instanceof AdminError ? err.message : 'Не удалось удалить бронь')
    } finally {
      setDeletingId(null)
    }
  }

  async function handleEmptyTrash() {
    const ok = await confirm({
      title: 'Очистить корзину навсегда?',
      message: `Будут безвозвратно удалены ВСЕ брони в корзине (${bookings.length} шт.). Отменить это действие нельзя.`,
      confirmLabel: 'Очистить корзину',
      danger: true,
    })
    if (!ok) return

    setEmptying(true)
    try {
      const count = await emptyTrash()
      setBookings([])
      toast.success(count > 0 ? `Удалено навсегда: ${count}` : 'Корзина уже пуста')
    } catch (err) {
      toast.error(err instanceof AdminError ? err.message : 'Не удалось очистить корзину')
    } finally {
      setEmptying(false)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-body text-sm text-blue-deep/60">
          Удалённые брони хранятся здесь, пока вы не очистите корзину — можно восстановить любую
          из них обратно в основной список.
        </p>
        <button
          type="button"
          disabled={emptying || bookings.length === 0}
          onClick={handleEmptyTrash}
          className="shrink-0 rounded-full bg-coral px-4 py-2 font-body text-sm font-medium text-white transition-colors hover:bg-coral/90 disabled:opacity-50"
        >
          {emptying ? 'Очищаем…' : 'Очистить корзину навсегда'}
        </button>
      </div>

      {loading ? (
        <p className="mt-4 font-body text-sm text-blue-deep/50">Загружаем…</p>
      ) : bookings.length === 0 ? (
        <p className="mt-4 font-body text-sm text-blue-deep/50">Корзина пуста.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {bookings.map((b) => (
            <li key={b.id} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-sm font-semibold text-blue-deep">
                  {b.slot_date && b.start_time && b.end_time
                    ? `${formatDateFull(b.slot_date)} · ${formatTimeRange(b.start_time, b.end_time)}`
                    : '—'}
                </span>
                <span className="rounded-full bg-border px-2 py-0.5 font-body text-xs text-blue-deep/60">
                  {STATUS_LABEL[b.status]}
                </span>
              </div>

              <div className="mt-2 grid gap-1 font-body text-sm text-blue-deep/80 sm:grid-cols-2">
                <p>{b.client_name}</p>
                <p>{b.client_phone}</p>
                <p>{b.client_email}</p>
                <p className="font-mono">{formatRub(b.total_price_kopecks)}</p>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-xs text-blue-deep/40">
                  {b.booking_code}
                  {b.deleted_at && <> · удалена {formatDateTime(b.deleted_at)}</>}
                </span>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={restoringId === b.id}
                    onClick={() => handleRestore(b)}
                    className="font-body text-xs text-mint hover:underline disabled:opacity-50"
                  >
                    {restoringId === b.id ? 'Восстанавливаем…' : 'Восстановить'}
                  </button>
                  <button
                    type="button"
                    disabled={deletingId === b.id}
                    onClick={() => handleDeleteForever(b)}
                    className="font-body text-xs text-coral hover:underline disabled:opacity-50"
                  >
                    {deletingId === b.id ? 'Удаляем…' : 'Удалить навсегда'}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
