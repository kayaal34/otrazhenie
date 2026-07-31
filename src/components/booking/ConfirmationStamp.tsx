import { motion, useReducedMotion } from 'motion/react'
import { ApertureMark } from '../ApertureMark'

type ConfirmationStampProps = {
  className?: string
}

/** «Печать» на подтверждении брони — вторая точка сигнатурной анимации. */
export function ConfirmationStamp({ className }: ConfirmationStampProps) {
  const reduced = useReducedMotion()

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, scale: 0.4, rotate: -18 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={
        reduced
          ? { duration: 0 }
          : { type: 'spring', stiffness: 260, damping: 16, delay: 0.1 }
      }
    >
      <ApertureMark className={className} />
    </motion.div>
  )
}
