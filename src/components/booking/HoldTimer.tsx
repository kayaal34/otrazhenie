import { useEffect } from 'react'
import { useCountdown } from '../../hooks/useCountdown'

type HoldTimerProps = {
  expiresAt: number
  onExpire: () => void
}

export function HoldTimer({ expiresAt, onExpire }: HoldTimerProps) {
  const { minutes, seconds, expired } = useCountdown(expiresAt)

  useEffect(() => {
    if (expired) onExpire()
  }, [expired, onExpire])

  const pad = (n: number) => String(n).padStart(2, '0')

  return (
    <div className="flex items-center justify-center gap-2 rounded-full bg-amber/20 px-4 py-2">
      <span className="font-body text-sm text-blue-deep/70">Слот удержан ещё</span>
      <span className="font-mono text-sm font-semibold text-blue-deep">
        {pad(minutes)}:{pad(seconds)}
      </span>
    </div>
  )
}
