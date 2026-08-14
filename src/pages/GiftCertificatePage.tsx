import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { usePricingRules } from '../hooks/usePricingRules'
import {
  createGiftCertificate,
  CertificateError,
  type CreateCertificateResult,
} from '../lib/certificates'
import { DurationToggle } from '../components/booking/DurationToggle'
import { PaymentInstructions } from '../components/PaymentInstructions'
import { PrimaryButton } from '../components/ui/PrimaryButton'
import { MascotAside } from '../components/MascotAside'
import giftMascotUrl from '../assets/mascot-gift.webp'

const inputClass =
  'mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 font-body text-blue-deep outline-none transition-colors focus:border-blue-primary'
const labelClass = 'block font-body text-sm font-medium text-blue-deep'

export function GiftCertificatePage() {
  const { rules, loading: rulesLoading } = usePricingRules()
  const [duration, setDuration] = useState<number | null>(null)
  const [recipientName, setRecipientName] = useState('')
  const [buyerName, setBuyerName] = useState('')
  const [buyerPhone, setBuyerPhone] = useState('')
  const [buyerEmail, setBuyerEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CreateCertificateResult | null>(null)

  const currentDuration = duration ?? rules[0]?.duration_hours ?? null

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!currentDuration) {
      setError('Выберите длительность сертификата')
      return
    }
    if (!recipientName.trim() || !buyerName.trim() || !buyerPhone.trim() || !buyerEmail.trim()) {
      setError('Заполните все поля')
      return
    }

    setSubmitting(true)
    try {
      const res = await createGiftCertificate({
        durationHours: currentDuration,
        recipientName,
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
          Сертификат для {recipientName} — как только увидим оплату, вышлем его на {buyerEmail}.
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
    <section className="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)_92px] items-start gap-x-4 gap-y-6 px-4 py-12 sm:grid-cols-[minmax(0,1fr)_132px] sm:px-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-x-16 lg:py-16">
      <div className="mx-auto w-full max-w-md">
        <h1 className="font-display text-2xl font-semibold text-blue-deep sm:text-3xl lg:text-center">
          Подарочный сертификат
        </h1>
        <p className="mt-3 font-body text-blue-deep/70 lg:text-center">
          Не знаешь, что подарить? Сертификат на съёмку в «Отражении» решает эту проблему за пару
          кликов — получатель сам выберет удобное время.
        </p>
      </div>

      {/* На телефоне стоит рядом с заголовком, с lg — отдельная колонка во всю высоту */}
      <MascotAside
        src={giftMascotUrl}
        alt="Леопардёнок с букетом цветов — маскот студии «Отражение»"
        width={412}
        height={772}
        from="right"
        className="lg:sticky lg:top-28 lg:row-span-2"
      />

      <div className="col-span-2 mx-auto w-full max-w-md lg:col-span-1">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <span className={labelClass}>Длительность</span>
            {rulesLoading ? (
              <p className="mt-2 font-body text-sm text-blue-deep/50">Загружаем тарифы…</p>
            ) : (
              <div className="mt-2">
                <DurationToggle rules={rules} value={currentDuration ?? 0} onChange={setDuration} />
              </div>
            )}
          </div>

          <div>
            <label className={labelClass} htmlFor="recipientName">
              Имя получателя
            </label>
            <input
              id="recipientName"
              placeholder="кому дарите сертификат"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              className={inputClass}
              required
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="buyerName">
              Ваше имя
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
              Ваш телефон
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
              Ваш email
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
      </div>
    </section>
  )
}
