import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { fetchBookingDetails, AdminError, type BookingDetailRow } from '../../lib/admin'
import { formatRub } from '../../lib/format'

const DAY_MS = 24 * 60 * 60 * 1000

function summarize(bookings: BookingDetailRow[], days: number) {
  const since = Date.now() - days * DAY_MS
  const relevant = bookings.filter(
    (b) =>
      (b.status === 'confirmed' || b.status === 'completed') &&
      new Date(b.created_at).getTime() >= since,
  )
  const revenue = relevant.reduce((sum, b) => sum + b.total_price_kopecks, 0)
  return { count: relevant.length, revenue }
}

export function StatsPanel() {
  const [bookings, setBookings] = useState<BookingDetailRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBookingDetails()
      .then(setBookings)
      .catch((err) => {
        toast.error(err instanceof AdminError ? err.message : 'Не удалось загрузить статистику')
      })
      .finally(() => setLoading(false))
  }, [])

  const week = useMemo(() => summarize(bookings, 7), [bookings])
  const month = useMemo(() => summarize(bookings, 30), [bookings])
  const cancelledCount = useMemo(
    () => bookings.filter((b) => b.status === 'cancelled').length,
    [bookings],
  )

  if (loading) {
    return <p className="font-body text-sm text-blue-deep/50">Загружаем статистику…</p>
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="rounded-2xl border border-border bg-surface p-5">
        <p className="font-body text-sm text-blue-deep/70">За 7 дней</p>
        <p className="mt-1 font-mono text-2xl font-semibold text-blue-deep">{week.count}</p>
        <p className="font-body text-sm text-blue-deep/50">броней</p>
        <p className="mt-2 font-mono text-lg text-mint">{formatRub(week.revenue)}</p>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <p className="font-body text-sm text-blue-deep/70">За 30 дней</p>
        <p className="mt-1 font-mono text-2xl font-semibold text-blue-deep">{month.count}</p>
        <p className="font-body text-sm text-blue-deep/50">броней</p>
        <p className="mt-2 font-mono text-lg text-mint">{formatRub(month.revenue)}</p>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <p className="font-body text-sm text-blue-deep/70">Отменено (всего)</p>
        <p className="mt-1 font-mono text-2xl font-semibold text-blue-deep">{cancelledCount}</p>
        <p className="font-body text-sm text-blue-deep/50">броней</p>
      </div>
    </div>
  )
}
