import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  fetchBookingDetails,
  cancelBooking,
  confirmPayment,
  trashBooking,
  bulkTrashBookingsBefore,
  AdminError,
  type BookingDetailRow,
} from '../../lib/admin'
import {
  formatDateFull,
  formatDateTime,
  formatRub,
  formatTimeRange,
  addDaysISO,
  todayISO,
} from '../../lib/format'
import { useConfirm } from './ConfirmDialog'

const inputClass =
  'rounded-xl border border-border bg-surface px-3 py-2 font-body text-blue-deep outline-none transition-colors focus:border-blue-primary'

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
  const confirmDialog = useConfirm()
  const [bookings, setBookings] = useState<BookingDetailRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('upcoming')
  const [search, setSearch] = useState('')
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [trashingId, setTrashingId] = useState<string | null>(null)
  const [cleanupDate, setCleanupDate] = useState(() => addDaysISO(todayISO(), -30))
  const [cleaningUp, setCleaningUp] = useState(false)

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
    let result = bookings.filter((b) => {
      if (filter === 'all') return true
      const startAt = b.start_at ? new Date(b.start_at).getTime() : 0
      return filter === 'upcoming' ? startAt >= now : startAt < now
    })

    const query = search.trim().toLowerCase()
    if (query) {
      result = result.filter(
        (b) =>
          b.client_name.toLowerCase().includes(query) ||
          b.booking_code.toLowerCase().includes(query) ||
          b.client_phone.toLowerCase().includes(query) ||
          b.client_email.toLowerCase().includes(query),
      )
    }

    // Брони, ожидающие оплаты, поднимаем наверх — их нужно замечать первыми
    return [...result].sort((a, b) => {
      const rank = (x: BookingDetailRow) => (x.status === 'pending_payment' ? 0 : 1)
      return rank(a) - rank(b)
    })
  }, [bookings, filter, search])

  async function handleCancel(booking: BookingDetailRow) {
    const ok = await confirmDialog({
      title: 'Отменить бронь?',
      message: `Бронь ${booking.booking_code} (${booking.client_name}) будет отменена, а слот освободится. Действие необратимо.`,
      confirmLabel: 'Отменить бронь',
      danger: true,
    })
    if (!ok) return

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

  async function handleCleanup() {
    const ok = await confirmDialog({
      title: 'Переместить старые брони в корзину?',
      message: `Все брони (любого статуса), оформленные до ${formatDateFull(cleanupDate)}, будут перемещены в «Корзину». Ничего не удаляется безвозвратно — при необходимости их можно будет восстановить.`,
      confirmLabel: 'Переместить в корзину',
      danger: true,
    })
    if (!ok) return

    setCleaningUp(true)
    try {
      const count = await bulkTrashBookingsBefore(cleanupDate)
      toast.success(
        count > 0 ? `В корзину перемещено броней: ${count}` : 'Нечего перемещать — подходящих броней не найдено',
      )
      if (count > 0) await load()
    } catch (err) {
      toast.error(err instanceof AdminError ? err.message : 'Не удалось выполнить очистку')
    } finally {
      setCleaningUp(false)
    }
  }

  async function handleTrash(booking: BookingDetailRow) {
    const ok = await confirmDialog({
      title: 'Удалить бронь?',
      message: `Бронь ${booking.booking_code} (${booking.client_name}) переместится в «Корзину» и пропадёт из этого списка. Слот при этом не освобождается — если нужно освободить время, сначала отмените бронь.`,
      confirmLabel: 'Удалить',
      danger: true,
    })
    if (!ok) return

    setTrashingId(booking.id)
    try {
      await trashBooking(booking.id)
      setBookings((prev) => prev.filter((b) => b.id !== booking.id))
      toast.success(`Бронь ${booking.booking_code} перемещена в корзину`)
    } catch (err) {
      toast.error(err instanceof AdminError ? err.message : 'Не удалось удалить бронь')
    } finally {
      setTrashingId(null)
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
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Поиск по имени, телефону, email или коду брони…"
        className="w-full rounded-xl border border-border bg-surface px-3 py-2 font-body text-blue-deep outline-none transition-colors focus:border-blue-primary"
      />

      <div className="mt-3 flex gap-2">
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
        <p className="mt-4 font-body text-sm text-blue-deep/50">
          {search.trim() ? 'Ничего не найдено по этому запросу.' : 'Броней нет.'}
        </p>
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
                <p className={b.photo_consent ? 'text-mint' : 'text-blue-deep/40'}>
                  {b.photo_consent
                    ? 'Разрешил(а) публикацию фото'
                    : 'Не разрешил(а) публикацию фото'}
                </p>
              </div>

              {(b.addon_kopecks > 0 || b.background_kopecks > 0 || b.discount_kopecks > 0) && (
                <p className="mt-1 font-body text-xs text-blue-deep/50">
                  {b.background_kopecks > 0 && <>Фон: +{formatRub(b.background_kopecks)} </>}
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
                <span className="font-mono text-xs text-blue-deep/40">
                  {b.booking_code} · забронировано {formatDateTime(b.created_at)}
                </span>

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

                  <button
                    type="button"
                    disabled={trashingId === b.id}
                    onClick={() => handleTrash(b)}
                    className="font-body text-xs text-blue-deep/40 hover:text-coral disabled:opacity-50"
                  >
                    {trashingId === b.id ? 'Удаляем…' : 'Удалить'}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <section className="mt-10 rounded-xl border border-coral/30 bg-coral/5 p-4">
        <h2 className="font-display text-sm font-semibold text-blue-deep">
          Массовое перемещение в корзину
        </h2>
        <p className="mt-1 font-body text-xs text-blue-deep/60">
          Перемещает в «Корзину» все брони (любого статуса), оформленные до выбранной даты —
          без ограничения по давности. Ничего не стирается безвозвратно: удалить записи навсегда
          можно будет из «Корзины».
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input
            type="date"
            value={cleanupDate}
            onChange={(e) => setCleanupDate(e.target.value)}
            className={inputClass}
          />
          <button
            type="button"
            disabled={cleaningUp}
            onClick={handleCleanup}
            className="rounded-full bg-coral px-4 py-2 font-body text-sm font-medium text-white transition-colors hover:bg-coral/90 disabled:opacity-50"
          >
            {cleaningUp ? 'Перемещаем…' : 'Переместить в корзину'}
          </button>
        </div>
      </section>
    </div>
  )
}
