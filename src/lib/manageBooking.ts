import { supabase } from './supabase'

export class ManageBookingError extends Error {}

export type ManagedBooking = {
  id: string
  bookingCode: string
  clientName: string
  status: string
  durationHours: number
  totalPriceKopecks: number
  backgroundName: string | null
  slotDate: string | null
  startTime: string | null
  endTime: string | null
  startAt: string | null
}

export async function findBookingForManagement(
  code: string,
  email: string,
): Promise<ManagedBooking | null> {
  const { data, error } = await supabase.rpc('find_booking_for_management', {
    p_code: code,
    p_email: email,
  })

  if (error) throw new ManageBookingError('Не удалось выполнить поиск. Попробуйте ещё раз.')

  const row = data?.[0]
  if (!row) return null

  return {
    id: row.id,
    bookingCode: row.booking_code,
    clientName: row.client_name,
    status: row.status,
    durationHours: row.duration_hours,
    totalPriceKopecks: row.total_price_kopecks,
    backgroundName: row.background_name,
    slotDate: row.slot_date,
    startTime: row.start_time,
    endTime: row.end_time,
    startAt: row.start_at,
  }
}

function mapManageError(raw: string): ManageBookingError {
  if (raw.includes('BOOKING_NOT_FOUND_OR_NOT_CANCELLABLE')) {
    return new ManageBookingError('Бронь не найдена, либо её уже нельзя отменить самостоятельно.')
  }
  if (raw.includes('BOOKING_NOT_FOUND_OR_NOT_RESCHEDULABLE')) {
    return new ManageBookingError('Бронь не найдена, либо её уже нельзя перенести самостоятельно.')
  }
  if (raw.includes('RESCHEDULE_WINDOW_CLOSED')) {
    return new ManageBookingError(
      'Самостоятельный перенос доступен только не позднее чем за 48 часов до начала брони. Напишите нам напрямую — решим индивидуально.',
    )
  }
  if (raw.includes('SLOT_UNAVAILABLE')) {
    return new ManageBookingError('Это время только что заняли. Выберите другой слот.')
  }
  if (raw.includes('INVALID_SLOT_COUNT')) {
    return new ManageBookingError('Выберите слоты на всю длительность брони.')
  }
  return new ManageBookingError('Что-то пошло не так. Попробуйте ещё раз.')
}

export async function clientCancelBooking(code: string, email: string): Promise<void> {
  const { error } = await supabase.rpc('client_cancel_booking', { p_code: code, p_email: email })
  if (error) throw mapManageError(error.message)
}

export type RescheduleResult = {
  bookingId: string
  bookingCode: string
  slotDate: string
  startTime: string
  endTime: string
}

export async function clientRescheduleBooking(
  code: string,
  email: string,
  newSlotIds: string[],
): Promise<RescheduleResult> {
  const { data, error } = await supabase.rpc('client_reschedule_booking', {
    p_code: code,
    p_email: email,
    p_new_slot_ids: newSlotIds,
  })

  if (error) throw mapManageError(error.message)

  const row = data?.[0]
  if (!row) throw new ManageBookingError('Что-то пошло не так. Попробуйте ещё раз.')

  return {
    bookingId: row.booking_id,
    bookingCode: row.booking_code,
    slotDate: row.slot_date,
    startTime: row.start_time,
    endTime: row.end_time,
  }
}
