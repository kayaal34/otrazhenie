import { Link } from 'react-router-dom'
import { ConfirmationStamp } from './ConfirmationStamp'
import { formatDateFull, formatRub, formatTimeRange } from '../../lib/format'
import { PAYMENT_DETAILS } from '../../lib/paymentDetails'
import type { ConfirmedSummary } from '../../store/bookingStore'

type ConfirmationScreenProps = {
  summary: ConfirmedSummary
  onBookAnother: () => void
}

export function ConfirmationScreen({ summary, onBookAnother }: ConfirmationScreenProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <ConfirmationStamp className="h-16 w-16 text-amber" />

      <h2 className="font-display text-2xl font-semibold text-blue-deep">
        Бронь создана — осталось оплатить
      </h2>

      <p className="max-w-sm font-body text-blue-deep/70">
        Время удержано за тобой: {formatDateFull(summary.dateISO)},{' '}
        {formatTimeRange(summary.startTime, summary.endTime)}. Детали продублировали на{' '}
        {summary.email}.
      </p>

      <div className="mt-2 rounded-xl border border-border bg-surface px-5 py-3">
        <p className="font-body text-xs tracking-wide text-blue-deep/50 uppercase">Код брони</p>
        <p className="font-mono text-xl font-semibold text-blue-deep">{summary.code}</p>
      </div>

      <div className="mt-4 w-full max-w-sm rounded-2xl border border-amber/40 bg-amber/10 p-5 text-left">
        <p className="font-display text-base font-semibold text-blue-deep">
          Переведи {formatRub(summary.priceKopecks)}
        </p>

        {(summary.addonKopecks > 0 || summary.discountKopecks > 0) && (
          <dl className="mt-3 flex flex-col gap-1 border-b border-amber/30 pb-3 font-body text-sm text-blue-deep/70">
            <div className="flex justify-between">
              <dt>Съёмка</dt>
              <dd className="font-mono">{formatRub(summary.basePriceKopecks)}</dd>
            </div>
            {summary.addonKopecks > 0 && (
              <div className="flex justify-between">
                <dt>Дополнительный фон</dt>
                <dd className="font-mono">+{formatRub(summary.addonKopecks)}</dd>
              </div>
            )}
            {summary.discountKopecks > 0 && (
              <div className="flex justify-between">
                <dt>Промокод {summary.promoCode}</dt>
                <dd className="font-mono">−{formatRub(summary.discountKopecks)}</dd>
              </div>
            )}
          </dl>
        )}

        <dl className="mt-3 flex flex-col gap-2 font-body text-sm text-blue-deep">
          <div className="flex justify-between gap-3">
            <dt className="text-blue-deep/60">Телефон</dt>
            <dd className="font-mono">{PAYMENT_DETAILS.phone}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-blue-deep/60">Банк</dt>
            <dd>{PAYMENT_DETAILS.bank}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-blue-deep/60">Получатель</dt>
            <dd>{PAYMENT_DETAILS.recipientName}</dd>
          </div>
        </dl>
        <p className="mt-4 font-body text-sm text-blue-deep/80">
          Пришли скриншот чека с кодом брони <span className="font-mono">{summary.code}</span> в{' '}
          <a
            href={`https://t.me/${PAYMENT_DETAILS.telegramContact.replace('@', '')}`}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-blue-primary hover:underline"
          >
            Telegram ({PAYMENT_DETAILS.telegramContact})
          </a>{' '}
          или WhatsApp ({PAYMENT_DETAILS.whatsappPhone}) — подтвердим бронь, как только увидим
          оплату.
        </p>
      </div>

      <div className="mt-4 flex gap-3">
        <button
          type="button"
          onClick={onBookAnother}
          className="rounded-full border border-border px-5 py-2 font-body text-sm text-blue-deep hover:border-blue-primary"
        >
          Забронировать ещё
        </button>
        <Link
          to="/"
          className="rounded-full px-5 py-2 font-body text-sm text-blue-primary hover:underline"
        >
          На главную
        </Link>
      </div>
    </div>
  )
}
