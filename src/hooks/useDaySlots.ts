import { useCallback, useEffect, useState } from 'react'
import { fetchDaySlots, type SlotRow } from '../lib/booking'

export function useDaySlots(dateISO: string) {
  const [slots, setSlots] = useState<SlotRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(() => {
    let cancelled = false
    setLoading(true)
    fetchDaySlots(dateISO)
      .then((data) => {
        if (!cancelled) setSlots(data)
      })
      .catch(() => {
        if (!cancelled) setError('Не удалось загрузить слоты')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [dateISO])

  useEffect(() => refetch(), [refetch])

  return { slots, loading, error, refetch }
}
