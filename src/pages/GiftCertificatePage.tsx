import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { usePricingRules } from '../hooks/usePricingRules'
import { createGiftCertificate, CertificateError, type CreateCertificateResult } from '../lib/certificates'
import { DurationToggle } from '../components/booking/DurationToggle'
import { PaymentInstructions } from '../components/PaymentInstructions'
import { PrimaryButton } from '../components/ui/PrimaryButton'

const inputClass =
  'mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 font-body text-blue-deep outline-none transition-colors focus:border-blue-primary'
const labelClass = 'block font-body text-sm font-medium text-blue-deep'

export function GiftCertificatePage() {
  const { rules, loading: rulesLoading } = usePricingRules()
  const [duration, setDuration] = useState<number | null>(null)
  const [buyerName, setBuyerName] = useState('')
  const [buyerPhone, setBuyerPhone] = useState('')
  const [buyerEmail, setBuyerEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CreateCertificateResult | null>(null)

  const currentDuration = duration ?? (rules[0]?.duration_hours ?? null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!currentDuration) {
      setError('Выберите длительность сертификата')
      return
    }
    if (!buyerName.trim() || !buyerPhone.trim() || !buyerEmail.trim()) {
      setError('Заполните все поля')
      return
    }

    setSubmitting(true)
    try {
      const res = await createGiftCertificate({
        durationHours: currentDuration,
        buyerName,
        buyerPhone,
        buyerEmail,
      })
      setResult(res)
    } catch (err) {
      setError(err instanceof CertificateError ? err.message : 'Не удалось оформить сертификат.')
    } finally {
      setSubmitting(false)
    }
  }

  if (result) {
    return (
      <section className="mx-auto max-w-md px-4 py-16 text-center sm:px-6">
        <h1 className="font-display text-2xl font-semibold text-blue-deep">
          Сертификат оформлен — осталось оплатить
        </h1>
        <p className="mt-3 font-body text-blue-deep/70">
          Как только увидим оплату, вышлем сертификат на {buyerEmail}.
        </p>

        <div className="mt-4 rounded-xl border border-border bg-surface px-5 py-3">
          <p className="font-body text-xs tracking-wide text-blue-deep/50 uppercase">
            Код сертификата
          </p>
          <p className="font-mono text-xl font-semibold text-blue-deep">{result.code}</p>
        </div>

        <div className="mt-4 flex justify-center">
          <PaymentInstructions
            amountKopecks={result.priceKopecks}
            code={result.code}
            codeLabel="кодом сертификата"
          />
        </div>

        <Link
          to="/"
          className="mt-6 inline-block font-body text-sm text-blue-primary hover:underline"
        >
          На главную
        </Link>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <h1 className="text-center font-display text-3xl font-semibold text-blue-deep">
        Подарочный сертификат
      </h1>
      <p className="mt-3 text-center font-body text-blue-deep/70">
        Не знаешь, что подарить? Сертификат на съёмку в «Отражении» решает эту проблему за пару
        кликов — получатель сам выберет удобное время.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
        <div>
          <span className={labelClass}>Длительность</span>
          {rulesLoading ? (
            <p className="mt-2 font-body text-sm text-blue-deep/50">Загружаем тарифы…</p>
          ) : (
            <div className="mt-2">
              <DurationToggle
                rules={rules}
                value={currentDuration ?? 0}
                onChange={setDuration}
              />
            </div>
          )}
        </div>

        <div>
          <label className={labelClass} htmlFor="buyerName">
            Имя
          </label>
          <input
            id="buyerName"
            value={buyerName}
            onChange={(e) => setBuyerName(e.target.value)}
            className={inputClass}
            required
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="buyerPhone">
            Телефон
          </label>
          <input
            id="buyerPhone"
            type="tel"
            placeholder="+7 900 000-00-00"
            value={buyerPhone}
            onChange={(e) => setBuyerPhone(e.target.value)}
            className={inputClass}
            required
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="buyerEmail">
            Email
          </label>
          <input
            id="buyerEmail"
            type="email"
            placeholder="куда отправить сертификат"
            value={buyerEmail}
            onChange={(e) => setBuyerEmail(e.target.value)}
            className={inputClass}
            required
          />
        </div>

        {error && <p className="font-body text-sm text-coral">{error}</p>}

        <PrimaryButton type="submit" disabled={submitting || !currentDuration}>
          {submitting ? 'Оформляем…' : 'Оформить сертификат'}
        </PrimaryButton>
      </form>
    </section>
  )
}
