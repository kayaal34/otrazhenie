import { supabase } from './supabase'
import { addDaysISO } from './format'
import { SLOT_GAP_MINUTES, type SlotRow, type BackgroundRow, type PricingRuleRow } from './booking'
import type { PromoDiscountType } from '../types/database'

const SLOT_DURATION_MINUTES = 60

function minutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`
}

export type BookingDetailRow = {
  id: string
  booking_code: string
  client_name: string
  client_phone: string
  client_email: string
  guests_count: number
  with_pet: boolean
  comment: string | null
  duration_hours: number
  total_price_kopecks: number
  addon_kopecks: number
  background_kopecks: number
  discount_kopecks: number
  promo_code: string | null
  status: 'pending_payment' | 'confirmed' | 'cancelled' | 'completed'
  payment_provider: string | null
  paid_at: string | null
  cancelled_at: string | null
  refund_kopecks: number | null
  created_at: string
  deleted_at: string | null
  photo_consent: boolean
  background_name: string | null
  slot_date: string | null
  start_time: string | null
  end_time: string | null
  start_at: string | null
}

export type PromoCodeRow = {
  id: string
  code: string
  discount_type: PromoDiscountType
  discount_value: number
  usage_limit: number | null
  usage_count: number
  is_active: boolean
  expires_at: string | null
  created_at: string
}

export class AdminError extends Error {}

export async function fetchSlotRange(fromISO: string, toISO: string): Promise<SlotRow[]> {
  const { data, error } = await supabase
    .from('slots')
    .select('*')
    .gte('slot_date', fromISO)
    .lte('slot_date', toISO)
    .order('slot_date', { ascending: true })
    .order('start_time', { ascending: true })

  if (error) throw new AdminError(error.message)
  return data ?? []
}

function datesBetween(fromISO: string, toISO: string): string[] {
  const dates: string[] = []
  let cursor = fromISO
  let guard = 0
  while (cursor <= toISO && guard < 366) {
    dates.push(cursor)
    cursor = addDaysISO(cursor, 1)
    guard++
  }
  return dates
}

export async function createSlotsBulk(
  fromISO: string,
  toISO: string,
  startHour: number,
  endHour: number,
): Promise<number> {
  if (startHour >= endHour) {
    throw new AdminError('Час начала должен быть раньше часа окончания.')
  }

  const dates = datesBetween(fromISO, toISO)
  const dayEndMinutes = endHour * 60

  const dayRows = (): { start_time: string; end_time: string }[] => {
    const out: { start_time: string; end_time: string }[] = []
    let cursor = startHour * 60
    while (cursor + SLOT_DURATION_MINUTES <= dayEndMinutes) {
      out.push({
        start_time: minutesToTime(cursor),
        end_time: minutesToTime(cursor + SLOT_DURATION_MINUTES),
      })
      // Часовой слот + технический перерыв на уборку/подготовку перед
      // следующим слотом (см. SLOT_GAP_MINUTES в lib/booking.ts).
      cursor += SLOT_DURATION_MINUTES + SLOT_GAP_MINUTES
    }
    return out
  }

  const template = dayRows()
  const rows = dates.flatMap((date) => template.map((r) => ({ slot_date: date, ...r })))

  const { error, count } = await supabase
    .from('slots')
    .upsert(rows, { onConflict: 'slot_date,start_time', ignoreDuplicates: true, count: 'exact' })

  if (error) throw new AdminError(error.message)
  return count ?? rows.length
}

export async function deleteSlot(slotId: string): Promise<void> {
  const { error, count } = await supabase
    .from('slots')
    .delete({ count: 'exact' })
    .eq('id', slotId)
    .eq('status', 'available')

  if (error) {
    if (error.message.includes('booking_slots_slot_id_fkey')) {
      throw new AdminError(
        'Слот нельзя удалить — с ним связана история брони (в том числе отменённой), она должна сохраниться. Слот остаётся доступен для новой брони.',
      )
    }
    throw new AdminError(error.message)
  }
  if (!count) {
    throw new AdminError('Слот уже забронирован или удержан — сначала снимите бронь.')
  }
}

export async function fetchBookingDetails(): Promise<BookingDetailRow[]> {
  const { data, error } = await supabase
    .from('booking_details')
    .select('*')
    .is('deleted_at', null)
    .order('start_at', { ascending: false })

  if (error) throw new AdminError(error.message)
  return data ?? []
}

export async function fetchTrashedBookings(): Promise<BookingDetailRow[]> {
  const { data, error } = await supabase
    .from('booking_details')
    .select('*')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })

  if (error) throw new AdminError(error.message)
  return data ?? []
}

export async function cancelBooking(bookingId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_cancel_booking', { p_booking_id: bookingId })
  if (error) throw new AdminError(error.message)
}

export async function confirmPayment(bookingId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_confirm_payment', { p_booking_id: bookingId })
  if (error) throw new AdminError(error.message)
}

/** Поштучное удаление брони — не стирает запись, а перемещает в «Корзину». */
export async function trashBooking(bookingId: string): Promise<void> {
  const { error } = await supabase
    .from('bookings')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', bookingId)

  if (error) throw new AdminError(error.message)
}

export async function restoreBooking(bookingId: string): Promise<void> {
  const { error } = await supabase.from('bookings').update({ deleted_at: null }).eq('id', bookingId)
  if (error) throw new AdminError(error.message)
}

/** Безвозвратное удаление одной брони из «Корзины». */
export async function permanentlyDeleteBooking(bookingId: string): Promise<void> {
  const { error } = await supabase.from('bookings').delete().eq('id', bookingId)
  if (error) throw new AdminError(error.message)
}

/** Безвозвратно стирает ВСЕ брони, лежащие в «Корзине». */
export async function emptyTrash(): Promise<number> {
  const { data, error } = await supabase.rpc('admin_empty_trash')
  if (error) throw new AdminError(error.message)
  return data ?? 0
}

export async function fetchPromoCodes(): Promise<PromoCodeRow[]> {
  const { data, error } = await supabase
    .from('promo_codes')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new AdminError(error.message)
  return data ?? []
}

export type NewPromoCode = {
  code: string
  discountType: PromoDiscountType
  discountValue: number
  usageLimit: number | null
  expiresAt: string | null
}

export async function createPromoCode(input: NewPromoCode): Promise<void> {
  const { error } = await supabase.from('promo_codes').insert({
    code: input.code.trim().toUpperCase(),
    discount_type: input.discountType,
    discount_value: input.discountValue,
    usage_limit: input.usageLimit,
    expires_at: input.expiresAt,
  })

  if (error) {
    if (error.message.includes('duplicate') || error.message.includes('unique')) {
      throw new AdminError('Такой промокод уже существует.')
    }
    throw new AdminError(error.message)
  }
}

export async function setPromoCodeActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.from('promo_codes').update({ is_active: isActive }).eq('id', id)
  if (error) throw new AdminError(error.message)
}

export async function deletePromoCode(id: string): Promise<void> {
  const { error } = await supabase.from('promo_codes').delete().eq('id', id)
  if (error) throw new AdminError(error.message)
}

/** Массово перемещает в «Корзину» все брони старше указанной даты — без ограничения по давности и по статусу. */
export async function bulkTrashBookingsBefore(olderThanISO: string): Promise<number> {
  const { data, error } = await supabase.rpc('admin_cleanup_old_bookings', {
    p_older_than: olderThanISO,
  })
  if (error) throw new AdminError(error.message)
  return data ?? 0
}

// -------------------------------------------------------------------------
// Тарифы (pricing_rules) — длительность + цена бронирования
// -------------------------------------------------------------------------

export async function fetchAllPricingRules(): Promise<PricingRuleRow[]> {
  const { data, error } = await supabase
    .from('pricing_rules')
    .select('*')
    .order('duration_hours', { ascending: true })

  if (error) throw new AdminError(error.message)
  return data ?? []
}

export type NewPricingRule = {
  durationHours: number
  priceKopecks: number
  label: string
}

export async function createPricingRule(input: NewPricingRule): Promise<void> {
  const { error } = await supabase.from('pricing_rules').insert({
    duration_hours: input.durationHours,
    price_kopecks: input.priceKopecks,
    label: input.label,
  })

  if (error) {
    if (error.message.includes('duplicate') || error.message.includes('pricing_rules_pkey')) {
      throw new AdminError('Тариф с такой длительностью уже существует.')
    }
    throw new AdminError(error.message)
  }
}

export async function updatePricingRule(
  durationHours: number,
  input: { priceKopecks: number; label: string },
): Promise<void> {
  const { error } = await supabase
    .from('pricing_rules')
    .update({ price_kopecks: input.priceKopecks, label: input.label })
    .eq('duration_hours', durationHours)

  if (error) throw new AdminError(error.message)
}

export async function deletePricingRule(durationHours: number): Promise<void> {
  const { error } = await supabase
    .from('pricing_rules')
    .delete()
    .eq('duration_hours', durationHours)

  if (error) {
    if (error.message.includes('foreign key') || error.message.includes('violates')) {
      throw new AdminError(
        'Нельзя удалить тариф — есть брони с такой длительностью в истории.',
      )
    }
    throw new AdminError(error.message)
  }
}

// -------------------------------------------------------------------------
// Фоны (backgrounds)
// -------------------------------------------------------------------------

export async function fetchAllBackgroundsAdmin(): Promise<BackgroundRow[]> {
  const { data, error } = await supabase
    .from('backgrounds')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) throw new AdminError(error.message)
  return data ?? []
}

export type NewBackground = {
  name: string
  priceKopecks: number
  sortOrder: number
}

export async function createBackground(input: NewBackground): Promise<void> {
  const { error } = await supabase.from('backgrounds').insert({
    name: input.name,
    price_kopecks: input.priceKopecks,
    sort_order: input.sortOrder,
  })

  if (error) throw new AdminError(error.message)
}

export async function updateBackground(
  id: string,
  input: { name: string; priceKopecks: number; sortOrder: number },
): Promise<void> {
  const { error } = await supabase
    .from('backgrounds')
    .update({ name: input.name, price_kopecks: input.priceKopecks, sort_order: input.sortOrder })
    .eq('id', id)

  if (error) throw new AdminError(error.message)
}

export async function setBackgroundActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from('backgrounds')
    .update({ is_active: isActive })
    .eq('id', id)

  if (error) throw new AdminError(error.message)
}

export async function deleteBackground(id: string): Promise<void> {
  const { error } = await supabase.from('backgrounds').delete().eq('id', id)

  if (error) {
    if (error.message.includes('foreign key') || error.message.includes('violates')) {
      throw new AdminError(
        'Нельзя удалить фон — есть брони с этим фоном в истории. Можно просто отключить его.',
      )
    }
    throw new AdminError(error.message)
  }
}
