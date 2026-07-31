import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { bookingFormSchema, type BookingFormValues } from '../../lib/bookingFormSchema'
import { BackgroundPicker } from './BackgroundPicker'
import { PrimaryButton } from '../ui/PrimaryButton'
import { formatRub } from '../../lib/format'
import { ADDON_LABEL, ADDON_PRICE_KOPECKS, validatePromoCode } from '../../lib/booking'
import type { BackgroundRow } from '../../lib/booking'

type BookingFormProps = {
  backgrounds: BackgroundRow[]
  priceKopecks: number
  submitting: boolean
  onSubmit: (values: BookingFormValues, promoCode: string | null) => void
}

const inputClass =
  'mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 font-body text-blue-deep outline-none transition-colors focus:border-blue-primary'
const labelClass = 'block font-body text-sm font-medium text-blue-deep'
const errClass = 'mt-1 font-body text-xs text-coral'

type AppliedPromo = {
  code: string
  discountKopecks: number
}

export function BookingForm({ backgrounds, priceKopecks, submitting, onSubmit }: BookingFormProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      clientName: '',
      clientPhone: '',
      clientEmail: '',
      backgroundId: '',
      guestsCount: 1,
      withPet: false,
      withAddon: false,
      comment: '',
      pdnConsent: false,
    },
  })

  const withAddon = watch('withAddon')
  const subtotalKopecks = priceKopecks + (withAddon ? ADDON_PRICE_KOPECKS : 0)

  const [promoInput, setPromoInput] = useState('')
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null)
  const [promoStatus, setPromoStatus] = useState<'idle' | 'checking'>('idle')
  const [promoError, setPromoError] = useState<string | null>(null)

  // Если сумма меняется (например, включили допуслугу) после того, как
  // промокод уже применён — пересчитываем скидку по актуальной сумме.
  useEffect(() => {
    if (!appliedPromo) return
    let cancelled = false
    validatePromoCode(appliedPromo.code, subtotalKopecks)
      .then((res) => {
        if (cancelled) return
        if (res.valid) {
          setAppliedPromo({ code: appliedPromo.code, discountKopecks: res.discountKopecks })
        } else {
          setAppliedPromo(null)
          setPromoError(res.message)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotalKopecks])

  const discountKopecks = appliedPromo?.discountKopecks ?? 0
  const totalKopecks = Math.max(subtotalKopecks - discountKopecks, 0)

  async function handleApplyPromo() {
    const code = promoInput.trim()
    if (!code) return

    setPromoStatus('checking')
    setPromoError(null)
    try {
      const res = await validatePromoCode(code, subtotalKopecks)
      if (res.valid) {
        setAppliedPromo({ code, discountKopecks: res.discountKopecks })
        setPromoError(null)
      } else {
        setAppliedPromo(null)
        setPromoError(res.message)
      }
    } catch {
      setAppliedPromo(null)
      setPromoError('Не удалось проверить промокод. Попробуйте ещё раз.')
    } finally {
      setPromoStatus('idle')
    }
  }

  function handleRemovePromo() {
    setAppliedPromo(null)
    setPromoInput('')
    setPromoError(null)
  }

  function submit(values: BookingFormValues) {
    onSubmit(values, appliedPromo?.code ?? null)
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-5">
      <div>
        <label className={labelClass} htmlFor="clientName">
          Имя
        </label>
        <input id="clientName" {...register('clientName')} className={inputClass} />
        {errors.clientName && <p className={errClass}>{errors.clientName.message}</p>}
      </div>

      <div>
        <label className={labelClass} htmlFor="clientPhone">
          Телефон
        </label>
        <input
          id="clientPhone"
          type="tel"
          placeholder="+7 900 000-00-00"
          {...register('clientPhone')}
          className={inputClass}
        />
        {errors.clientPhone && <p className={errClass}>{errors.clientPhone.message}</p>}
      </div>

      <div>
        <label className={labelClass} htmlFor="clientEmail">
          Email
        </label>
        <input
          id="clientEmail"
          type="email"
          placeholder="для подтверждения брони"
          {...register('clientEmail')}
          className={inputClass}
        />
        {errors.clientEmail && <p className={errClass}>{errors.clientEmail.message}</p>}
      </div>

      <div>
        <span className={labelClass}>Фон</span>
        <Controller
          control={control}
          name="backgroundId"
          render={({ field }) => (
            <BackgroundPicker backgrounds={backgrounds} value={field.value} onChange={field.onChange} />
          )}
        />
        {errors.backgroundId && <p className={errClass}>{errors.backgroundId.message}</p>}
      </div>

      <div>
        <label className={labelClass} htmlFor="guestsCount">
          Количество человек в кадре
        </label>
        <input
          id="guestsCount"
          type="number"
          min={1}
          max={6}
          {...register('guestsCount', { valueAsNumber: true })}
          className={`${inputClass} w-24`}
        />
        {errors.guestsCount && <p className={errClass}>{errors.guestsCount.message}</p>}
      </div>

      <label className="flex items-center gap-2 font-body text-sm text-blue-deep">
        <input type="checkbox" {...register('withPet')} className="h-4 w-4 rounded border-border" />
        Буду с животным 🐾
      </label>

      <label className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface px-3 py-2 font-body text-sm text-blue-deep">
        <span className="flex items-center gap-2">
          <input
            type="checkbox"
            {...register('withAddon')}
            className="h-4 w-4 rounded border-border"
          />
          {ADDON_LABEL}
        </span>
        <span className="font-mono text-blue-deep/70">+{formatRub(ADDON_PRICE_KOPECKS)}</span>
      </label>

      <div>
        <label className={labelClass} htmlFor="comment">
          Комментарий
        </label>
        <textarea
          id="comment"
          rows={3}
          placeholder="Особый повод? Дай знать"
          {...register('comment')}
          className={inputClass}
        />
        {errors.comment && <p className={errClass}>{errors.comment.message}</p>}
      </div>

      <div>
        <span className={labelClass}>Промокод</span>
        {appliedPromo ? (
          <div className="mt-1 flex items-center justify-between rounded-xl border border-mint/40 bg-mint/10 px-3 py-2">
            <span className="font-mono text-sm text-blue-deep">
              {appliedPromo.code} · −{formatRub(appliedPromo.discountKopecks)}
            </span>
            <button
              type="button"
              onClick={handleRemovePromo}
              className="font-body text-xs text-blue-deep/60 hover:text-coral"
            >
              Убрать
            </button>
          </div>
        ) : (
          <div className="mt-1 flex gap-2">
            <input
              type="text"
              value={promoInput}
              onChange={(e) => setPromoInput(e.target.value)}
              placeholder="Например, WELCOME10"
              className={`${inputClass} mt-0 flex-1 uppercase`}
            />
            <button
              type="button"
              onClick={handleApplyPromo}
              disabled={!promoInput.trim() || promoStatus === 'checking'}
              className="shrink-0 rounded-xl border border-blue-primary px-4 py-2 font-body text-sm text-blue-primary transition-colors hover:bg-blue-primary hover:text-white disabled:opacity-50"
            >
              {promoStatus === 'checking' ? 'Проверяем…' : 'Применить'}
            </button>
          </div>
        )}
        {promoError && <p className={errClass}>{promoError}</p>}
      </div>

      <div>
        <label className="flex items-start gap-2 font-body text-sm text-blue-deep">
          <input
            type="checkbox"
            {...register('pdnConsent')}
            className="mt-1 h-4 w-4 rounded border-border"
          />
          <span>
            Согласен(на) на{' '}
            <Link to="/privacy" target="_blank" className="text-blue-primary hover:underline">
              обработку персональных данных
            </Link>
          </span>
        </label>
        {errors.pdnConsent && <p className={errClass}>{errors.pdnConsent.message}</p>}
      </div>

      {(withAddon || appliedPromo) && (
        <div className="flex flex-col gap-1 rounded-xl border border-border bg-surface px-4 py-3 font-body text-sm">
          <div className="flex justify-between text-blue-deep/70">
            <span>Съёмка</span>
            <span className="font-mono">{formatRub(priceKopecks)}</span>
          </div>
          {withAddon && (
            <div className="flex justify-between text-blue-deep/70">
              <span>{ADDON_LABEL}</span>
              <span className="font-mono">+{formatRub(ADDON_PRICE_KOPECKS)}</span>
            </div>
          )}
          {appliedPromo && (
            <div className="flex justify-between text-mint">
              <span>Промокод {appliedPromo.code}</span>
              <span className="font-mono">−{formatRub(appliedPromo.discountKopecks)}</span>
            </div>
          )}
          <div className="mt-1 flex justify-between border-t border-border pt-1 font-semibold text-blue-deep">
            <span>Итого</span>
            <span className="font-mono">{formatRub(totalKopecks)}</span>
          </div>
        </div>
      )}

      <PrimaryButton type="submit" disabled={submitting}>
        {submitting ? 'Оформляем…' : `Забронировать — ${formatRub(totalKopecks)}`}
      </PrimaryButton>
    </form>
  )
}
