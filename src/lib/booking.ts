import { supabase } from './supabase'
import { addDaysISO, todayISO } from './format'

export type SlotRow = {
  id: string
  slot_date: string
  start_time: string
  end_time: string
  status: 'available' | 'locked' | 'booked'
  locked_until: string | null
  locked_by_token: string | null
  created_at: string
}

export type BackgroundRow = {
  id: string
  name: string
  is_active: boolean
  sort_order: number
  created_at: string
}

export type PricingRuleRow = {
  duration_hours: number
  price_kopecks: number
  label: string
}

export type SlotGroup = {
  start: SlotRow
  slots: SlotRow[]
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export async function fetchDaySlots(dateISO: string): Promise<SlotRow[]> {
  const { data, error } = await supabase
    .from('slots')
    .select('*')
    .eq('slot_date', dateISO)
    .order('start_time', { ascending: true })

  if (error) throw error
  return data ?? []
}

/** Даты в окне [from, from+days), для которых есть хотя бы один свободный слот. */
export async function fetchDateAvailability(
  days = 21,
  fromISO: string = todayISO(),
): Promise<Set<string>> {
  const toISO = addDaysISO(fromISO, days)

  const { data, error } = await supabase
    .from('slots')
    .select('slot_date')
    .eq('status', 'available')
    .gte('slot_date', fromISO)
    .lt('slot_date', toISO)

  if (error) throw error
  return new Set((data ?? []).map((row) => row.slot_date))
}

export async function fetchBackgrounds(): Promise<BackgroundRow[]> {
  const { data, error } = await supabase
    .from('backgrounds')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function fetchPricingRules(): Promise<PricingRuleRow[]> {
  const { data, error } = await supabase
    .from('pricing_rules')
    .select('*')
    .order('duration_hours', { ascending: true })

  if (error) throw error
  return data ?? []
}

/**
 * Из плоского списка слотов дня собирает валидные варианты начала брони
 * для заданной длительности — только смежные, свободные часовые окна.
 */
export function groupConsecutiveSlots(daySlots: SlotRow[], durationHours: number): SlotGroup[] {
  const sorted = [...daySlots].sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time))
  const groups: SlotGroup[] = []

  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].status !== 'available') continue

    const chain: SlotRow[] = [sorted[i]]
    let expectedStart = toMinutes(sorted[i].end_time)

    for (let j = i + 1; chain.length < durationHours && j < sorted.length; j++) {
      const candidate = sorted[j]
      if (candidate.status !== 'available') break
      if (toMinutes(candidate.start_time) !== expectedStart) break
      chain.push(candidate)
      expectedStart = toMinutes(candidate.end_time)
    }

    if (chain.length === durationHours) {
      groups.push({ start: sorted[i], slots: chain })
    }
  }

  return groups
}

export class BookingError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}

function mapRpcError(raw: string): BookingError {
  if (raw.includes('SLOT_UNAVAILABLE')) {
    return new BookingError(
      'SLOT_UNAVAILABLE',
      'Это время только что заняли. Выберите другой слот.',
    )
  }
  if (raw.includes('HOLD_EXPIRED_OR_INVALID')) {
    return new BookingError(
      'HOLD_EXPIRED_OR_INVALID',
      'Время удержания слота истекло. Выберите слот заново.',
    )
  }
  if (raw.includes('NO_PRICING_RULE_FOR_DURATION')) {
    return new BookingError(
      'NO_PRICING_RULE_FOR_DURATION',
      'Для этой длительности пока не задана цена. Свяжитесь со студией.',
    )
  }
  if (raw.includes('PROMO_NOT_FOUND')) {
    return new BookingError('PROMO_NOT_FOUND', 'Промокод не найден.')
  }
  if (raw.includes('PROMO_INACTIVE')) {
    return new BookingError('PROMO_INACTIVE', 'Промокод больше не активен.')
  }
  if (raw.includes('PROMO_EXPIRED')) {
    return new BookingError('PROMO_EXPIRED', 'Срок действия промокода истёк.')
  }
  if (raw.includes('PROMO_LIMIT_REACHED')) {
    return new BookingError('PROMO_LIMIT_REACHED', 'Лимит использований промокода исчерпан.')
  }
  return new BookingError('UNKNOWN', 'Что-то пошло не так. Попробуйте ещё раз.')
}

/** Фиксированная цена дополнительной опции (доп. фон) — 500 ₽. Держим в
 * синхроне с константой 50000 в create_booking() на сервере. */
export const ADDON_PRICE_KOPECKS = 50000
export const ADDON_LABEL = 'Дополнительный фон'

export async function holdSlots(
  slotIds: string[],
  holdToken: string,
  holdMinutes = 15,
): Promise<void> {
  const { error } = await supabase.rpc('hold_slots', {
    p_slot_ids: slotIds,
    p_hold_token: holdToken,
    p_hold_minutes: holdMinutes,
  })

  if (error) throw mapRpcError(error.message)
}

export type CreateBookingPayload = {
  holdToken: string
  clientName: string
  clientPhone: string
  clientEmail: string
  backgroundId: string
  guestsCount: number
  withPet: boolean
  comment: string | null
  pdnConsent: boolean
  durationHours: number
  withAddon: boolean
  promoCode: string | null
}

export type CreateBookingResult = {
  bookingId: string
  bookingCode: string
  totalPriceKopecks: number
  addonKopecks: number
  discountKopecks: number
}

/**
 * Создаёт бронь со статусом 'pending_payment' — оплата ручная, переводом.
 * Подтверждает её администратор в панели после получения чека.
 */
export async function createBooking(
  payload: CreateBookingPayload,
): Promise<CreateBookingResult> {
  const { data, error } = await supabase.rpc('create_booking', {
    p_hold_token: payload.holdToken,
    p_client_name: payload.clientName,
    p_client_phone: payload.clientPhone,
    p_client_email: payload.clientEmail,
    p_background_id: payload.backgroundId,
    p_guests_count: payload.guestsCount,
    p_with_pet: payload.withPet,
    p_comment: payload.comment,
    p_pdn_consent: payload.pdnConsent,
    p_duration_hours: payload.durationHours,
    p_with_addon: payload.withAddon,
    p_promo_code: payload.promoCode,
  })

  if (error) throw mapRpcError(error.message)

  const row = data?.[0]
  if (!row) throw mapRpcError('UNKNOWN')

  return {
    bookingId: row.booking_id,
    bookingCode: row.booking_code,
    totalPriceKopecks: row.total_price_kopecks,
    addonKopecks: row.addon_kopecks,
    discountKopecks: row.discount_kopecks,
  }
}

export type PromoValidationResult = {
  valid: boolean
  discountKopecks: number
  message: string
}

/** Предпросмотр скидки — не тратит лимит использований промокода. */
export async function validatePromoCode(
  code: string,
  subtotalKopecks: number,
): Promise<PromoValidationResult> {
  const { data, error } = await supabase.rpc('validate_promo_code', {
    p_code: code,
    p_subtotal_kopecks: subtotalKopecks,
  })

  if (error) throw mapRpcError(error.message)

  const row = data?.[0]
  if (!row) return { valid: false, discountKopecks: 0, message: 'Промокод не найден' }

  return { valid: row.valid, discountKopecks: row.discount_kopecks, message: row.message }
}
