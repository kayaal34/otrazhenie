import { formatRub } from '../lib/format'
import { PAYMENT_DETAILS } from '../lib/paymentDetails'

export type PaymentBreakdownLine = {
  label: string
  amountKopecks: number
  isDiscount?: boolean
}

type PaymentInstructionsProps = {
  amountKopecks: number
  code: string
  codeLabel?: string
  breakdown?: PaymentBreakdownLine[]
}

/**
 * Универсальный блок «как оплатить» — не привязан к конкретной брони,
 * подходит для оплаты сертификатов и любых других услуг вне сетки слотов.
 * Используется на экране подтверждения брони и при покупке сертификата.
 */
export function PaymentInstructions({
  amountKopecks,
  code,
  codeLabel = 'код',
  breakdown,
}: PaymentInstructionsProps) {
  return (
    <div className="w-full max-w-sm rounded-2xl border border-amber/40 bg-amber/10 p-5 text-left">
      <p className="font-display text-base font-semibold text-blue-deep">
        Переведи {formatRub(amountKopecks)}
      </p>

      {breakdown && breakdown.length > 0 && (
        <dl className="mt-3 flex flex-col gap-1 border-b border-amber/30 pb-3 font-body text-sm text-blue-deep/70">
          {breakdown.map((line) => (
            <div key={line.label} className="flex justify-between">
              <dt>{line.label}</dt>
              <dd className={`font-mono ${line.isDiscount ? 'text-mint' : ''}`}>
                {line.isDiscount ? '−' : ''}
                {formatRub(line.amountKopecks)}
              </dd>
            </div>
          ))}
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
        Пришли скриншот чека с {codeLabel} <span className="font-mono">{code}</span> в{' '}
        <a
          href={`https://t.me/${PAYMENT_DETAILS.telegramContact.replace('@', '')}`}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-blue-primary hover:underline"
        >
          Telegram ({PAYMENT_DETAILS.telegramContact})
        </a>{' '}
        или WhatsApp ({PAYMENT_DETAILS.whatsappPhone}) — подтвердим оплату, как только увидим
        перевод.
      </p>
    </div>
  )
}
