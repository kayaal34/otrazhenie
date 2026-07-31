// Supabase Edge Function (Deno). Вызывается триггером БД (см.
// supabase/patch_005_manual_payment.sql) на трёх событиях брони —
// создана (ждём перевод), оплата подтверждена администратором, отменена.
//
// Секреты (Supabase Dashboard → Edge Functions → telegram-notify → Secrets,
// либо `supabase secrets set`):
//   TELEGRAM_BOT_TOKEN     — токен бота от @BotFather
//   TELEGRAM_CHAT_ID       — chat_id администратора/канала для уведомлений
//   WEBHOOK_SHARED_SECRET  — произвольная строка, тот же секрет прописан
//                            в SQL-триггере, чтобы функцию нельзя было
//                            вызвать извне без него
//
// SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY доступны автоматически.

import { createClient } from 'npm:@supabase/supabase-js@2'

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID')!
const WEBHOOK_SHARED_SECRET = Deno.env.get('WEBHOOK_SHARED_SECRET')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

type NotifyEvent = 'pending_payment' | 'confirmed' | 'cancelled'

type NotifyPayload = {
  event: NotifyEvent
  booking_id: string
}

type BookingDetail = {
  booking_code: string
  client_name: string
  client_phone: string
  client_email: string
  guests_count: number
  with_pet: boolean
  total_price_kopecks: number
  background_name: string | null
  slot_date: string | null
  start_time: string | null
  end_time: string | null
  refund_kopecks: number | null
}

function formatMoney(kopecks: number): string {
  return new Intl.NumberFormat('ru-RU').format(Math.round(kopecks / 100)) + ' ₽'
}

function formatWhen(dateISO: string | null, start: string | null, end: string | null): string {
  if (!dateISO || !start || !end) return '—'
  const [y, m, d] = dateISO.split('-')
  return `${d}.${m}.${y}, ${start.slice(0, 5)}–${end.slice(0, 5)}`
}

function buildMessage(event: NotifyEvent, b: BookingDetail): string {
  const when = formatWhen(b.slot_date, b.start_time, b.end_time)
  const pet = b.with_pet ? ' · с питомцем 🐾' : ''

  if (event === 'pending_payment') {
    return (
      `🕒 <b>Новая бронь — ждём оплату</b>\n` +
      `📅 ${when}\n` +
      `👤 ${b.client_name}\n` +
      `📞 ${b.client_phone}\n` +
      `✉️ ${b.client_email}\n` +
      `🎨 Фон: ${b.background_name ?? '—'}\n` +
      `👥 ${b.guests_count} чел.${pet}\n` +
      `💰 К оплате: ${formatMoney(b.total_price_kopecks)}\n` +
      `Код: ${b.booking_code}\n\n` +
      `Жди чек с этим кодом и подтверди оплату в админке.`
    )
  }

  if (event === 'confirmed') {
    return (
      `✅ <b>Оплата подтверждена</b>\n` +
      `📅 ${when}\n` +
      `👤 ${b.client_name}\n` +
      `💰 ${formatMoney(b.total_price_kopecks)}\n` +
      `Код: ${b.booking_code}`
    )
  }

  const refundLine =
    b.refund_kopecks !== null && b.refund_kopecks > 0
      ? `💸 Возврат: ${formatMoney(b.refund_kopecks)}\n`
      : ''

  return (
    `❌ <b>Бронь отменена</b>\n` +
    `📅 ${when}\n` +
    `👤 ${b.client_name}\n` +
    refundLine +
    `Код: ${b.booking_code}`
  )
}

async function sendTelegramMessage(text: string): Promise<void> {
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'HTML' }),
  })
  if (!res.ok) {
    throw new Error(`Telegram API ${res.status}: ${await res.text()}`)
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  if (req.headers.get('x-webhook-secret') !== WEBHOOK_SHARED_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }

  let payload: NotifyPayload
  try {
    payload = await req.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const { data: booking, error } = await supabase
    .from('booking_details')
    .select('*')
    .eq('id', payload.booking_id)
    .single()

  if (error || !booking) {
    console.error('booking not found', payload.booking_id, error)
    return new Response(JSON.stringify({ ok: false, error: 'booking not found' }), { status: 200 })
  }

  try {
    await sendTelegramMessage(buildMessage(payload.event, booking as BookingDetail))
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 200 })
  }
})
