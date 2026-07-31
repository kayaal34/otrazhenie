import { useEffect, useState } from 'react'
import { fetchBackgrounds, type BackgroundRow } from '../lib/booking'

export function useBackgrounds() {
  const [backgrounds, setBackgrounds] = useState<BackgroundRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchBackgrounds()
      .then((data) => {
        if (!cancelled) setBackgrounds(data)
      })
      .catch(() => {
        if (!cancelled) setError('Не удалось загрузить фоны')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { backgrounds, loading, error }
}
