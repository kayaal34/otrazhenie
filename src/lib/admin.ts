import { supabase } from './supabase'
import { addDaysISO } from './format'
import type { SlotRow } from './booking'

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
  status: 'pending_payment' | 'confirmed' | 'cancelled' | 'completed'
  payment_provider: string | null
  paid_at: string | null
  cancelled_at: string | null
  refund_kopecks: number | null
  created_at: string
  background_name: string | null
  slot_date: string | null
  start_time: string | null
  end_time: string | null
  start_at: string | null
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
  const rows = dates.flatMap((date) =>
    Array.from({ length: endHour - startHour }, (_, i) => {
      const h = startHour + i
      return {
        slot_date: date,
        start_time: `${String(h).padStart(2, '0')}:00:00`,
        end_time: `${String(h + 1).padStart(2, '0')}:00:00`,
      }
    }),
  )

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

  if (error) throw new AdminError(error.message)
  if (!count) {
    throw new AdminError('Слот уже забронирован или удержан — сначала снимите бронь.')
  }
}

export async function fetchBookingDetails(): Promise<BookingDetailRow[]> {
  const { data, error } = await supabase
    .from('booking_details')
    .select('*')
    .order('start_at', { ascending: false })

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
