import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { bookingFormSchema, type BookingFormValues } from '../../lib/bookingFormSchema'
import { BackgroundPicker } from './BackgroundPicker'
import { PrimaryButton } from '../ui/PrimaryButton'
import { formatRub } from '../../lib/format'
import type { BackgroundRow } from '../../lib/booking'

type BookingFormProps = {
  backgrounds: BackgroundRow[]
  priceKopecks: number
  submitting: boolean
  onSubmit: (values: BookingFormValues) => void
}

const inputClass =
  'mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 font-body text-blue-deep outline-none transition-colors focus:border-blue-primary'
const labelClass = 'block font-body text-sm font-medium text-blue-deep'
const errClass = 'mt-1 font-body text-xs text-coral'

export function BookingForm({ backgrounds, priceKopecks, submitting, onSubmit }: BookingFormProps) {
  const {
    register,
    handleSubmit,
    control,
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
      comment: '',
      pdnConsent: false,
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
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

      <PrimaryButton type="submit" disabled={submitting}>
        {submitting ? 'Оформляем…' : `Забронировать — ${formatRub(priceKopecks)}`}
      </PrimaryButton>
    </form>
  )
}
