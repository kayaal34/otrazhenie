import { useEffect, useState } from 'react'
import { fetchDateAvailability } from '../lib/booking'

export function useDateAvailability(days = 21) {
  const [availableDates, setAvailableDates] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchDateAvailability(days)
      .then((data) => {
        if (!cancelled) setAvailableDates(data)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [days])

  return { availableDates, loading }
}
