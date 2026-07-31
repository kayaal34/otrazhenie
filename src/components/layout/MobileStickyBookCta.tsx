import { useLocation } from 'react-router-dom'
import { PrimaryLink } from '../ui/PrimaryLink'

const HIDDEN_PREFIXES = ['/booking', '/admin']

/** Липкая CTA-кнопка снизу экрана на мобильных — из design-doc «Мобильная версия». */
export function MobileStickyBookCta() {
  const location = useLocation()
  if (HIDDEN_PREFIXES.some((prefix) => location.pathname.startsWith(prefix))) {
    return null
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-cream/95 px-4 pt-3 backdrop-blur sm:hidden"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <PrimaryLink to="/booking" className="w-full">
        Забронировать — от 3 100 ₽
      </PrimaryLink>
    </div>
  )
}
