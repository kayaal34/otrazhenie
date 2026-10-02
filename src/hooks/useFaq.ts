import { useEffect, useState } from 'react'
import { fetchPublishedFaq, type FaqRow } from '../lib/faq'

export function useFaq() {
  const [items, setItems] = useState<FaqRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchPublishedFaq()
      .then((data) => {
        if (!cancelled) setItems(data)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { items, loading, error }
}
