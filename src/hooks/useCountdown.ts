import { useEffect, useState } from 'react'

export function useCountdown(targetMs: number | null) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (targetMs === null) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [targetMs])

  if (targetMs === null) {
    return { remainingMs: 0, minutes: 0, seconds: 0, expired: false }
  }

  const remainingMs = Math.max(0, targetMs - now)
  const minutes = Math.floor(remainingMs / 60000)
  const seconds = Math.floor((remainingMs % 60000) / 1000)

  return { remainingMs, minutes, seconds, expired: remainingMs <= 0 }
}
