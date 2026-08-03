// Supabase Edge Function (Deno). Вызывается триггерами БД на событиях
// брони (см. patch_005_manual_payment.sql) и подарочного сертификата
// (см. patch_023_certificate_telegram_notify.sql).
//
// Секреты (Supabase Dashboard → Edge Functions → telegram-notify → Secrets,
// либо `supabase secrets set`):
//   TELEGRAM_BOT_TOKEN     — токен бота от @BotFather
//   TELEGRAM_CHAT_ID       — chat_id получателей уведомлений. Можно указать
//                            несколько через запятую, например:
//                              123456789,987654321
//                            Каждый chat_id получает то же самое сообщение
//                            независимо от остальных — если один из них
//                            недоступен (например, друг ещё не написал
//                            боту /start), это не мешает остальным.
//   WEBHOOK_SHARED_SECRET  — произвольная строка, тот же секрет прописан
//                            в SQL-триггерах, чтобы функцию нельзя было
//                            вызвать извне без него
//
// SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY доступны автоматически.

import { createClient } from 'npm:@supabase/supabase-js@2'

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!
const TELEGRAM_CHAT_IDS = (Deno.env.get('TELEGRAM_CHAT_ID') ?? '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean)
const WEBHOOK_SHARED_SECRET = Deno.env.get('WEBHOOK_SHARED_SECRET')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

type BookingEvent = 'pending_payment' | 'confirmed' | 'cancelled'
type CertificateEvent = 'purchased' | 'confirmed'

// Триггер брони шлёт booking_id, триггер сертификата — certificate_id;
// какое поле пришло, такое событие и обрабатываем.
type NotifyPayload = {
  event: BookingEvent | CertificateEvent
  booking_id?: string
  certificate_id?: string
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

type CertificateDetail = {
  code: string
  duration_hours: number
  price_kopecks: number
  recipient_name: string
  buyer_name: string
  buyer_phone: string
  buyer_email: string
}

function formatMoney(kopecks: number): string {
  return new Intl.NumberFormat('ru-RU').format(Math.round(kopecks / 100)) + ' ₽'
}

function formatWhen(dateISO: string | null, start: string | null, end: string | null): string {
  if (!dateISO || !start || !end) return '—'
  const [y, m, d] = dateISO.split('-')
  return `${d}.${m}.${y}, ${start.slice(0, 5)}–${end.slice(0, 5)}`
}

function buildBookingMessage(event: BookingEvent, b: BookingDetail): string {
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

function buildCertificateMessage(event: CertificateEvent, c: CertificateDetail): string {
  if (event === 'purchased') {
    return (
      `🎁 <b>Новый сертификат — ждём оплату</b>\n` +
      `🎀 Кому: ${c.recipient_name}\n` +
      `🧾 Покупатель: ${c.buyer_name}\n` +
      `📞 ${c.buyer_phone}\n` +
      `✉️ ${c.buyer_email}\n` +
      `⏱ ${c.duration_hours} ч\n` +
      `💰 К оплате: ${formatMoney(c.price_kopecks)}\n` +
      `Код: ${c.code}\n\n` +
      `Жди чек с этим кодом и подтверди оплату в админке.`
    )
  }

  return (
    `✅ <b>Сертификат оплачен</b>\n` +
    `🎀 Кому: ${c.recipient_name}\n` +
    `💰 ${formatMoney(c.price_kopecks)}\n` +
    `Код: ${c.code}`
  )
}

async function sendToOneChat(chatId: string, text: string): Promise<void> {
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  })
  if (!res.ok) {
    throw new Error(`Telegram API ${res.status} for chat_id=${chatId}: ${await res.text()}`)
  }
}

/**
 * Рассылает сообщение всем получателям из TELEGRAM_CHAT_ID независимо друг
 * от друга — если один получатель недоступен, это не мешает остальным.
 * Бросает ошибку, только если получатели заданы, но сообщение не дошло ни
 * до одного из них.
 */
async function sendTelegramMessage(text: string): Promise<void> {
  const results = await Promise.allSettled(
    TELEGRAM_CHAT_IDS.map((chatId) => sendToOneChat(chatId, text)),
  )

  const failures = results.filter(
    (r): r is PromiseRejectedResult => r.status === 'rejected',
  )

  failures.forEach((f) => console.error(f.reason))

  if (results.length > 0 && failures.length === results.length) {
    throw new Error(failures.map((f) => String(f.reason)).join('; '))
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

  let message: string

  if (payload.certificate_id) {
    const { data: certificate, error } = await supabase
      .from('gift_certificates')
      .select('code, duration_hours, price_kopecks, recipient_name, buyer_name, buyer_phone, buyer_email')
      .eq('id', payload.certificate_id)
      .single()

    if (error || !certificate) {
      console.error('certificate not found', payload.certificate_id, error)
      return new Response(JSON.stringify({ ok: false, error: 'certificate not found' }), { status: 200 })
    }

    message = buildCertificateMessage(payload.event as CertificateEvent, certificate as CertificateDetail)
  } else if (payload.booking_id) {
    const { data: booking, error } = await supabase
      .from('booking_details')
      .select('*')
      .eq('id', payload.booking_id)
      .single()

    if (error || !booking) {
      console.error('booking not found', payload.booking_id, error)
      return new Response(JSON.stringify({ ok: false, error: 'booking not found' }), { status: 200 })
    }

    message = buildBookingMessage(payload.event as BookingEvent, booking as BookingDetail)
  } else {
    return new Response(JSON.stringify({ ok: false, error: 'missing booking_id or certificate_id' }), {
      status: 400,
    })
  }

  try {
    await sendTelegramMessage(message)
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 200 })
  }
})
