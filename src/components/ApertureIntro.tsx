import { motion, useReducedMotion } from 'motion/react'
import { ApertureMark } from './ApertureMark'

type ApertureIntroProps = {
  className?: string
}

/** Раскрытие диафрагмы при загрузке страницы — используется в hero. */
export function ApertureIntro({ className }: ApertureIntroProps) {
  const reduced = useReducedMotion()

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, scale: 0.55, rotate: -35 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ duration: reduced ? 0 : 1.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <ApertureMark className={className} />
    </motion.div>
  )
}
