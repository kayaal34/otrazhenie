import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { signOutAdmin } from '../../lib/adminAuth'
import { supabase } from '../../lib/supabase'
import { getLastSeen, markSeen, type NotificationKey } from '../../lib/adminNotifications'
import { SlotsPanel } from './SlotsPanel'
import { BookingsPanel } from './BookingsPanel'
import { StatsPanel } from './StatsPanel'
import { GalleryPanel } from './GalleryPanel'
import { PromoCodesPanel } from './PromoCodesPanel'
import { PricingRulesPanel } from './PricingRulesPanel'
import { BackgroundsPanel } from './BackgroundsPanel'
import { TrashPanel } from './TrashPanel'
import { CertificatesPanel } from './CertificatesPanel'
import { ConfirmProvider } from './ConfirmDialog'

type Tab =
  | 'slots'
  | 'bookings'
  | 'trash'
  | 'gallery'
  | 'promo'
  | 'pricing'
  | 'backgrounds'
  | 'certificates'
  | 'stats'

const tabs: { key: Tab; label: string; badgeKey?: NotificationKey }[] = [
  { key: 'slots', label: 'Слоты' },
  { key: 'bookings', label: 'Брони', badgeKey: 'bookings' },
  { key: 'trash', label: 'Корзина' },
  { key: 'gallery', label: 'Галерея' },
  { key: 'promo', label: 'Промокоды' },
  { key: 'pricing', label: 'Тарифы' },
  { key: 'backgrounds', label: 'Фоны' },
  { key: 'certificates', label: 'Сертификаты', badgeKey: 'certificates' },
  { key: 'stats', label: 'Статистика' },
]

const BADGE_POLL_MS = 30_000

type AdminDashboardProps = {
  session: Session
}

export function AdminDashboard({ session }: AdminDashboardProps) {
  const [tab, setTab] = useState<Tab>('slots')
  const [badges, setBadges] = useState<Record<NotificationKey, number>>({ bookings: 0, certificates: 0 })

  const refreshBadges = useCallback(async () => {
    const [bookingsResult, certificatesResult] = await Promise.all([
      supabase
        .from('booking_details')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null)
        .gt('created_at', getLastSeen('bookings')),
      supabase
        .from('gift_certificates')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null)
        .gt('created_at', getLastSeen('certificates')),
    ])

    setBadges({
      bookings: bookingsResult.count ?? 0,
      certificates: certificatesResult.count ?? 0,
    })
  }, [])

  useEffect(() => {
    refreshBadges()
    const interval = setInterval(refreshBadges, BADGE_POLL_MS)
    return () => clearInterval(interval)
  }, [refreshBadges])

  function selectTab(next: Tab, badgeKey?: NotificationKey) {
    setTab(next)
    if (badgeKey) {
      markSeen(badgeKey)
      setBadges((prev) => ({ ...prev, [badgeKey]: 0 }))
    }
  }

  return (
    <ConfirmProvider>
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

        <div className="mt-6 flex flex-wrap gap-2 border-b border-border">
          {tabs.map((t) => {
            const badgeCount = t.badgeKey ? badges[t.badgeKey] : 0
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => selectTab(t.key, t.badgeKey)}
                className={`relative px-3 py-2 font-body text-sm transition-colors ${
                  tab === t.key
                    ? 'border-b-2 border-blue-primary text-blue-primary'
                    : 'text-blue-deep/60 hover:text-blue-deep'
                }`}
              >
                {t.label}
                {badgeCount > 0 && (
                  <span className="absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral px-1 font-body text-[10px] font-semibold leading-none text-white">
                    {badgeCount > 9 ? '9+' : badgeCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="mt-6">
          {tab === 'slots' && <SlotsPanel />}
          {tab === 'bookings' && <BookingsPanel />}
          {tab === 'trash' && <TrashPanel />}
          {tab === 'gallery' && <GalleryPanel />}
          {tab === 'promo' && <PromoCodesPanel />}
          {tab === 'pricing' && <PricingRulesPanel />}
          {tab === 'backgrounds' && <BackgroundsPanel />}
          {tab === 'certificates' && <CertificatesPanel />}
          {tab === 'stats' && <StatsPanel />}
        </div>
      </div>
    </ConfirmProvider>
  )
}
