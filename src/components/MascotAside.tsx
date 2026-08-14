import { motion, useReducedMotion } from 'motion/react'

type MascotAsideProps = {
  src: string
  alt: string
  width: number
  height: number
  className?: string
  /** Сдвиг появления: маскот справа выезжает справа, слева — слева. */
  from?: 'left' | 'right'
}

/** Маскот без фона сбоку от текста: мягкое свечение, лёгкое парение, тень под лапами. */
export function MascotAside({
  src,
  alt,
  width,
  height,
  className,
  from = 'right',
}: MascotAsideProps) {
  const reduced = useReducedMotion()

  return (
    <motion.div
      className={`relative mx-auto w-full select-none ${className ?? ''}`}
      initial={reduced ? false : { opacity: 0, x: from === 'right' ? 28 : -28, scale: 0.95 }}
      whileInView={{ opacity: 1, x: 0, scale: 1 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: reduced ? 0 : 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* На телефоне маскот мелкий, и свечение вокруг него читается как рамка — поэтому только с sm */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-[-14%] top-[4%] bottom-[6%] hidden rounded-full blur-2xl sm:block"
        style={{
          background:
            'radial-gradient(50% 50% at 50% 45%, rgba(58,123,255,0.18) 0%, rgba(58,123,255,0.06) 48%, rgba(58,123,255,0) 74%)',
        }}
      />

      <motion.img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
        draggable={false}
        className="relative w-full [filter:drop-shadow(0_8px_12px_rgba(10,46,107,0.12))] sm:[filter:drop-shadow(0_16px_24px_rgba(10,46,107,0.2))]"
        animate={reduced ? undefined : { y: [0, -9, 0] }}
        transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        aria-hidden
        className="pointer-events-none absolute bottom-[1%] left-1/2 hidden h-3 w-[48%] -translate-x-1/2 rounded-[50%] bg-blue-deep/20 blur-md sm:block"
        animate={reduced ? undefined : { scaleX: [1, 0.88, 1], opacity: [0.5, 0.32, 0.5] }}
        transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut' }}
      />
    </motion.div>
  )
}
