type ApertureMarkProps = {
  className?: string
  /**
   * CSS-only hover-microinteraction для CTA: лепестки чуть смыкаются
   * при наведении на родителя с классом `group` (см. src/components/ui).
   */
  interactive?: boolean
}

/**
 * Сигнатурный знак «Отражение» — раскрытая диафрагма.
 * Оркестрованные версии (hero-загрузка, штамп подтверждения) оборачивают
 * этот компонент через `motion` — см. ApertureIntro и ConfirmationStamp.
 */
export function ApertureMark({ className, interactive }: ApertureMarkProps) {
  const blades = 5
  const center = 50
  const outerR = 46
  const innerR = 16

  const bladePaths = Array.from({ length: blades }, (_, i) => {
    const angle = (360 / blades) * i
    return (
      <path
        key={i}
        d={`M ${center} ${center - innerR}
            L ${center + outerR * Math.sin((Math.PI * 2) / blades)} ${
              center - outerR * Math.cos((Math.PI * 2) / blades)
            }
            L ${center} ${center}
            Z`}
        transform={`rotate(${angle} ${center} ${center})`}
      />
    )
  })

  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Отражение — логотип"
    >
      <circle
        cx={center}
        cy={center}
        r={outerR}
        fill="none"
        stroke="currentColor"
        strokeWidth={7}
      />
      <g
        style={{ transformBox: 'fill-box', transformOrigin: '50% 50%' }}
        className={
          interactive
            ? 'transition-transform duration-300 ease-out group-hover:-rotate-6 group-hover:scale-[0.8]'
            : undefined
        }
      >
        {bladePaths}
      </g>
    </svg>
  )
}
