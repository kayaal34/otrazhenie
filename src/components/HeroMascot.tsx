import { motion, useReducedMotion } from 'motion/react'
import mascotUrl from '../assets/mascot-leopard.webp'

type HeroMascotProps = {
  className?: string
}

/** Точка на картинке, откуда «летит» сигнал — кончик пульта. */
const SIGNAL_ORIGIN = { left: '9%', top: '24%' }
const SIGNAL_RINGS = [0, 1.2, 2.4]

/** Маскот студии с пультом: мягкое свечение, парение и импульс сигнала от пульта. */
export function HeroMascot({ className }: HeroMascotProps) {
  const reduced = useReducedMotion()

  return (
    <motion.div
      className={`relative mx-auto w-full max-w-[220px] select-none sm:max-w-[280px] lg:max-w-[340px] xl:max-w-[380px] ${className ?? ''}`}
      initial={reduced ? false : { opacity: 0, y: 32, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: reduced ? 0 : 1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
    >
      {/* Мягкое свечение позади маскота */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-x-[-18%] top-[6%] bottom-[8%] hidden rounded-full blur-2xl sm:block"
        style={{
          background:
            'radial-gradient(50% 50% at 50% 45%, rgba(58,123,255,0.22) 0%, rgba(58,123,255,0.08) 45%, rgba(58,123,255,0) 72%)',
        }}
        animate={reduced ? undefined : { opacity: [0.75, 1, 0.75], scale: [1, 1.05, 1] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        className="relative"
        animate={reduced ? undefined : { y: [0, -12, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Импульс сигнала от пульта */}
        {!reduced && (
          <div aria-hidden className="pointer-events-none absolute inset-0">
            {SIGNAL_RINGS.map((delay) => (
              <motion.span
                key={delay}
                className="absolute h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-blue-primary sm:h-20 sm:w-20"
                style={SIGNAL_ORIGIN}
                initial={{ scale: 0.25, opacity: 0 }}
                animate={{ scale: [0.25, 1.6], opacity: [0, 0.45, 0] }}
                transition={{ duration: 3.6, repeat: Infinity, delay, ease: 'easeOut' }}
              />
            ))}
          </div>
        )}

        <img
          src={mascotUrl}
          alt="Маскот студии «Отражение» — леопардёнок с пультом"
          width={480}
          height={678}
          draggable={false}
          fetchPriority="high"
          className="relative w-full [filter:drop-shadow(0_9px_13px_rgba(10,46,107,0.13))] sm:[filter:drop-shadow(0_18px_26px_rgba(10,46,107,0.22))]"
        />
      </motion.div>

      {/* Тень под лапами — «заземляет» парящего маскота */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute bottom-[1%] left-1/2 h-3 w-[52%] -translate-x-1/2 rounded-[50%] bg-blue-deep/20 blur-md sm:h-4"
        animate={reduced ? undefined : { scaleX: [1, 0.86, 1], opacity: [0.55, 0.35, 0.55] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
    </motion.div>
  )
}
