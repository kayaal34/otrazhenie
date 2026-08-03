import { Link } from 'react-router-dom'
import { ConfirmationStamp } from './ConfirmationStamp'
import { PaymentInstructions, type PaymentBreakdownLine } from '../PaymentInstructions'
import { formatDateFull, formatTimeRange } from '../../lib/format'
import type { ConfirmedSummary } from '../../store/bookingStore'

type ConfirmationScreenProps = {
  summary: ConfirmedSummary
  onBookAnother: () => void
}

export function ConfirmationScreen({ summary, onBookAnother }: ConfirmationScreenProps) {
  const breakdown: PaymentBreakdownLine[] = []
  if (summary.addonKopecks > 0 || summary.backgroundKopecks > 0 || summary.discountKopecks > 0) {
    breakdown.push({ label: 'Съёмка', amountKopecks: summary.basePriceKopecks })
    if (summary.backgroundKopecks > 0) {
      breakdown.push({ label: 'Фон', amountKopecks: summary.backgroundKopecks })
    }
    if (summary.addonKopecks > 0) {
      breakdown.push({ label: 'Дополнительный фон', amountKopecks: summary.addonKopecks })
    }
    if (summary.discountKopecks > 0) {
      breakdown.push({
        label: `Промокод ${summary.promoCode}`,
        amountKopecks: summary.discountKopecks,
        isDiscount: true,
      })
    }
  }

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

      <div className="mt-4">
        <PaymentInstructions
          amountKopecks={summary.priceKopecks}
          code={summary.code}
          codeLabel="кодом брони"
          breakdown={breakdown}
        />
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
