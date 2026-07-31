import { useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { useBookingStore } from '../store/bookingStore'
import { useDateAvailability } from '../hooks/useDateAvailability'
import { useDaySlots } from '../hooks/useDaySlots'
import { useBackgrounds } from '../hooks/useBackgrounds'
import { usePricingRules } from '../hooks/usePricingRules'
import {
  groupConsecutiveSlots,
  holdSlots,
  createBooking,
  BookingError,
  type SlotGroup,
} from '../lib/booking'
import { todayISO, formatDateLabel, formatRub } from '../lib/format'
import type { BookingFormValues } from '../lib/bookingFormSchema'

import { DateStrip } from '../components/booking/DateStrip'
import { DurationToggle } from '../components/booking/DurationToggle'
import { SlotList } from '../components/booking/SlotList'
import { HoldTimer } from '../components/booking/HoldTimer'
import { BookingForm } from '../components/booking/BookingForm'
import { ProcessingOverlay } from '../components/booking/ProcessingOverlay'
import { ConfirmationScreen } from '../components/booking/ConfirmationScreen'

const HOLD_MINUTES = 15

function newHoldToken(): string {
  return crypto.randomUUID()
}

export function BookingPage() {
  const [selectedDate, setSelectedDate] = useState(todayISO())

  const { availableDates, loading: datesLoading } = useDateAvailability(21)
  const { slots: daySlots, loading: slotsLoading, refetch: refetchSlots } = useDaySlots(selectedDate)
  const { backgrounds, loading: bgLoading } = useBackgrounds()
  const { rules, loading: rulesLoading } = usePricingRules()

  const {
    step,
    duration,
    heldSlots,
    holdToken,
    holdExpiresAt,
    confirmed,
    error,
    setDuration,
    setHold,
    goToForm,
    goToProcessing,
    setConfirmed,
    backToSlots,
    reset,
  } = useBookingStore()

  // Синхронизируем длительность с первым доступным тарифом после загрузки
  useEffect(() => {
    if (rules.length > 0 && !rules.some((r) => r.duration_hours === duration)) {
      setDuration(rules[0].duration_hours)
    }
  }, [rules, duration, setDuration])

  const groups = useMemo(() => groupConsecutiveSlots(daySlots, duration), [daySlots, duration])

  const nearestAvailableDates = useMemo(() => {
    return Array.from(availableDates)
      .filter((d) => d !== selectedDate)
      .sort()
      .slice(0, 3)
  }, [availableDates, selectedDate])

  const currentRule = rules.find((r) => r.duration_hours === duration)

  async function handleSelectGroup(group: SlotGroup) {
    const token = newHoldToken()
    try {
      await holdSlots(
        group.slots.map((s) => s.id),
        token,
        HOLD_MINUTES,
      )
      setHold(group.slots, token, Date.now() + HOLD_MINUTES * 60 * 1000)
      goToForm()
    } catch (err) {
      const message = err instanceof BookingError ? err.message : 'Не удалось удержать слот.'
      toast.error(message)
      refetchSlots()
    }
  }

  function handleExpire() {
    toast.error('Время удержания слота истекло. Выберите слот заново.')
    backToSlots()
    refetchSlots()
  }

  async function handleFormSubmit(values: BookingFormValues) {
    if (!holdToken || heldSlots.length === 0) return

    goToProcessing()

    try {
      const result = await createBooking({
        holdToken,
        clientName: values.clientName,
        clientPhone: values.clientPhone,
        clientEmail: values.clientEmail,
        backgroundId: values.backgroundId,
        guestsCount: values.guestsCount,
        withPet: values.withPet,
        comment: values.comment || null,
        pdnConsent: values.pdnConsent,
        durationHours: duration,
      })

      setConfirmed({
        dateISO: selectedDate,
        startTime: heldSlots[0].start_time,
        endTime: heldSlots[heldSlots.length - 1].end_time,
        email: values.clientEmail,
        code: result.bookingCode,
        priceKopecks: currentRule?.price_kopecks ?? 0,
      })
    } catch (err) {
      const message = err instanceof BookingError ? err.message : 'Не удалось оформить бронь.'
      toast.error(message)
      backToSlots(message)
      refetchSlots()
    }
  }

  function handleBookAnother() {
    reset()
    refetchSlots()
  }

  return (
    <section className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="text-center font-display text-3xl font-semibold text-blue-deep">
        Бронирование
      </h1>

      {error && step === 'slot' && (
        <p className="mt-4 rounded-xl border border-coral/30 bg-coral/10 px-4 py-2 text-center font-body text-sm text-coral">
          {error}
        </p>
      )}

      {step === 'slot' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mt-8 flex flex-col gap-8"
        >
          <div>
            <h2 className="mb-3 font-display text-lg font-semibold text-blue-deep">
              Сколько времени тебе нужно?
            </h2>
            {rulesLoading ? (
              <p className="font-body text-sm text-blue-deep/50">Загружаем тарифы…</p>
            ) : (
              <DurationToggle rules={rules} value={duration} onChange={setDuration} />
            )}
          </div>

          <div>
            <h2 className="mb-3 font-display text-lg font-semibold text-blue-deep">Выбери дату</h2>
            <DateStrip
              selected={selectedDate}
              onSelect={setSelectedDate}
              availableDates={availableDates}
              loading={datesLoading}
            />
            <p className="mt-2 font-body text-sm text-blue-deep/70">
              {formatDateLabel(selectedDate)}
            </p>
          </div>

          <div>
            <h2 className="mb-3 font-display text-lg font-semibold text-blue-deep">
              Свободное время
            </h2>
            <SlotList groups={groups} onSelect={handleSelectGroup} loading={slotsLoading} />

            {!slotsLoading && groups.length === 0 && (
              <div className="rounded-xl border border-border bg-surface px-4 py-4 text-center">
                <p className="font-body text-sm text-blue-deep">
                  На эту дату нет свободных интервалов на {duration} ч.
                </p>
                {nearestAvailableDates.length > 0 && (
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    {nearestAvailableDates.map((date) => (
                      <button
                        key={date}
                        type="button"
                        onClick={() => setSelectedDate(date)}
                        className="rounded-full border border-blue-primary px-3 py-1 font-body text-sm text-blue-primary hover:bg-blue-primary hover:text-white"
                      >
                        {formatDateLabel(date)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {step === 'form' && holdExpiresAt && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mt-8 flex flex-col gap-6"
        >
          <HoldTimer expiresAt={holdExpiresAt} onExpire={handleExpire} />

          <div className="rounded-xl border border-border bg-surface px-4 py-3 text-center">
            <p className="font-body text-sm text-blue-deep/70">
              {formatDateLabel(selectedDate)} ·{' '}
              {heldSlots[0]?.start_time.slice(0, 5)}–
              {heldSlots[heldSlots.length - 1]?.end_time.slice(0, 5)}
            </p>
            {currentRule && (
              <p className="mt-1 font-mono text-lg font-semibold text-blue-deep">
                {formatRub(currentRule.price_kopecks)}
              </p>
            )}
          </div>

          {bgLoading ? (
            <p className="font-body text-sm text-blue-deep/50">Загружаем фоны…</p>
          ) : (
            <BookingForm
              backgrounds={backgrounds}
              priceKopecks={currentRule?.price_kopecks ?? 0}
              submitting={false}
              onSubmit={handleFormSubmit}
            />
          )}
        </motion.div>
      )}

      {step === 'processing' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
          <ProcessingOverlay />
        </motion.div>
      )}

      {step === 'confirmed' && confirmed && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <ConfirmationScreen summary={confirmed} onBookAnother={handleBookAnother} />
        </motion.div>
      )}
    </section>
  )
}
