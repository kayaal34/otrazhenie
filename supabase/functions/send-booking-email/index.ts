// Supabase Edge Function (Deno). Вызывается триггером БД (см.
// supabase/patch_007_release_hold_and_email.sql) когда администратор
// подтверждает оплату — отправляет клиенту письмо через Resend.
//
// Секреты (Supabase Dashboard → Edge Functions → send-booking-email →
// Secrets, либо `supabase secrets set`):
//   RESEND_API_KEY         — ключ API из resend.com
//   EMAIL_FROM              — адрес отправителя, напр.
//                              'Отражение <booking@ваш-домен.ру>'
//   WEBHOOK_SHARED_SECRET   — та же строка, что и у telegram-notify —
//                              один общий секрет для обеих функций
//
// SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY доступны автоматически.

import { createClient } from 'npm:@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const EMAIL_FROM = Deno.env.get('EMAIL_FROM')!
const WEBHOOK_SHARED_SECRET = Deno.env.get('WEBHOOK_SHARED_SECRET')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

type NotifyPayload = {
  booking_id: string
}

type BookingDetail = {
  booking_code: string
  client_name: string
  client_email: string
  slot_date: string | null
  start_time: string | null
  end_time: string | null
  total_price_kopecks: number
}

const MONTHS = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
]

function formatMoney(kopecks: number): string {
  return new Intl.NumberFormat('ru-RU').format(Math.round(kopecks / 100)) + ' ₽'
}

function formatWhen(dateISO: string | null, start: string | null, end: string | null): string {
  if (!dateISO || !start || !end) return '—'
  const [y, m, d] = dateISO.split('-')
  const monthName = MONTHS[Number(m) - 1]
  return `${Number(d)} ${monthName} ${y}, ${start.slice(0, 5)}–${end.slice(0, 5)}`
}

function buildHtml(b: BookingDetail): string {
  const when = formatWhen(b.slot_date, b.start_time, b.end_time)
  return `
    <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #0A2E6B;">
      <h1 style="font-size: 22px; margin: 0 0 12px;">Готово. Бронь подтверждена ✓</h1>
      <p style="font-size: 15px; line-height: 1.5; color: #333;">
        Привет, ${b.client_name}! Мы получили оплату — бронь в студии «Отражение» подтверждена.
      </p>
      <table style="width: 100%; margin: 20px 0; border-collapse: collapse; font-size: 14px;">
        <tr>
          <td style="padding: 6px 0; color: #666;">Дата и время</td>
          <td style="padding: 6px 0; text-align: right; font-weight: 600;">${when}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #666;">Сумма</td>
          <td style="padding: 6px 0; text-align: right; font-weight: 600;">${formatMoney(b.total_price_kopecks)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #666;">Код брони</td>
          <td style="padding: 6px 0; text-align: right; font-family: monospace; font-weight: 600;">${b.booking_code}</td>
        </tr>
      </table>
      <p style="font-size: 14px; color: #666; line-height: 1.5;">
        Ждём тебя в назначенное время. Если планы изменились — напиши нам и укажи код брони.
      </p>
      <p style="font-size: 13px; color: #999; margin-top: 24px;">
        Отражение · Студия автопортрета · Камышлов
      </p>
    </div>
  `
}

async function sendEmail(to: string, html: string): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to,
      subject: 'Бронь подтверждена — Отражение',
      html,
    }),
  })
  if (!res.ok) {
    throw new Error(`Resend API ${res.status}: ${await res.text()}`)
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
    await sendEmail(booking.client_email, buildHtml(booking as BookingDetail))
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 200 })
  }
})
