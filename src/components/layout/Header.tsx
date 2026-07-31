import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { ApertureMark } from '../ApertureMark'
import { PrimaryLink } from '../ui/PrimaryLink'

const links = [
  { to: '/booking', label: 'Бронирование' },
  { to: '/gallery', label: 'Галерея' },
  { to: '/about', label: 'О студии' },
]

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-cream/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <NavLink
          to="/"
          className="group flex items-center gap-2"
          onClick={() => setMenuOpen(false)}
        >
          <ApertureMark interactive className="h-9 w-9 text-blue-primary" />
          <span className="font-display text-lg font-semibold text-blue-deep">Отражение</span>
        </NavLink>

        <nav className="hidden items-center gap-6 sm:flex">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `font-body text-sm transition-colors ${
                  isActive ? 'text-blue-primary' : 'text-blue-deep/70 hover:text-blue-deep'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <PrimaryLink to="/booking" size="sm" className="hidden sm:inline-flex">
          Забронировать
        </PrimaryLink>

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'}
          aria-expanded={menuOpen}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-blue-deep sm:hidden"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {menuOpen && (
        <nav className="flex flex-col gap-1 border-t border-border bg-cream px-4 py-3 sm:hidden">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 font-body text-sm ${
                  isActive ? 'bg-blue-primary/10 text-blue-primary' : 'text-blue-deep/80'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  )
}
