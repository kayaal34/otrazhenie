import { useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { signOutAdmin } from '../../lib/adminAuth'
import { SlotsPanel } from './SlotsPanel'
import { BookingsPanel } from './BookingsPanel'
import { StatsPanel } from './StatsPanel'
import { GalleryPanel } from './GalleryPanel'
import { PromoCodesPanel } from './PromoCodesPanel'

type Tab = 'slots' | 'bookings' | 'gallery' | 'promo' | 'stats'

const tabs: { key: Tab; label: string }[] = [
  { key: 'slots', label: 'Слоты' },
  { key: 'bookings', label: 'Брони' },
  { key: 'gallery', label: 'Галерея' },
  { key: 'promo', label: 'Промокоды' },
  { key: 'stats', label: 'Статистика' },
]

type AdminDashboardProps = {
  session: Session
}

export function AdminDashboard({ session }: AdminDashboardProps) {
  const [tab, setTab] = useState<Tab>('slots')

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold text-blue-deep">Админ-панель</h1>
        <div className="flex items-center gap-3">
          <span className="font-body text-sm text-blue-deep/60">{session.user.email}</span>
          <button
            type="button"
            onClick={() => signOutAdmin()}
            className="rounded-full border border-border px-3 py-1.5 font-body text-sm text-blue-deep hover:border-blue-primary"
          >
            Выйти
          </button>
        </div>
      </div>

      <div className="mt-6 flex gap-2 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 font-body text-sm transition-colors ${
              tab === t.key
                ? 'border-b-2 border-blue-primary text-blue-primary'
                : 'text-blue-deep/60 hover:text-blue-deep'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'slots' && <SlotsPanel />}
        {tab === 'bookings' && <BookingsPanel />}
        {tab === 'gallery' && <GalleryPanel />}
        {tab === 'promo' && <PromoCodesPanel />}
        {tab === 'stats' && <StatsPanel />}
      </div>
    </div>
  )
}
