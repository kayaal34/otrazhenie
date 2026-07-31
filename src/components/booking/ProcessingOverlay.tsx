import { motion, useReducedMotion } from 'motion/react'
import { ApertureMark } from '../ApertureMark'

export function ProcessingOverlay() {
  const reduced = useReducedMotion()

  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <motion.div
        animate={reduced ? undefined : { rotate: 360 }}
        transition={reduced ? undefined : { repeat: Infinity, duration: 1.6, ease: 'linear' }}
      >
        <ApertureMark className="h-16 w-16 text-blue-primary" />
      </motion.div>
      <p className="font-body text-blue-deep/70">Оформляем бронь…</p>
    </div>
  )
}
