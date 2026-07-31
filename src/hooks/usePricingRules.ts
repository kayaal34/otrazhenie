import { useEffect, useState } from 'react'
import { fetchPricingRules, type PricingRuleRow } from '../lib/booking'

export function usePricingRules() {
  const [rules, setRules] = useState<PricingRuleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchPricingRules()
      .then((data) => {
        if (!cancelled) setRules(data)
      })
      .catch(() => {
        if (!cancelled) setError('Не удалось загрузить цены')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { rules, loading, error }
}
