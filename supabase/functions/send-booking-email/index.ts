// Supabase Edge Function (Deno). Вызывается триггером/RPC в БД (см.
// supabase/patch_007_release_hold_and_email.sql и
// supabase/patch_024_certificate_trash_and_notifications.sql) на трёх
// событиях жизненного цикла брони:
//   - 'confirmed'   — администратор подтвердил оплату
//   - 'cancelled'   — бронь отменена (администратором или самим клиентом)
//   - 'rescheduled' — клиент перенёс бронь на другое время самостоятельно
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

type BookingEvent = 'confirmed' | 'cancelled' | 'rescheduled'

type NotifyPayload = {
  event?: BookingEvent
  booking_id: string
  old_slot_date?: string | null
  old_start_time?: string | null
  old_end_time?: string | null
}

type BookingDetail = {
  booking_code: string
  client_name: string
  client_email: string
  slot_date: string | null
  start_time: string | null
  end_time: string | null
  total_price_kopecks: number
  refund_kopecks: number | null
}

const MONTHS = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
]

function formatMoney(kopecks: number): string {
  return new Intl.NumberFormat('ru-RU').format(Math.round(kopecks / 100)) + ' ₽'
}

function formatWhen(dateISO: string | null | undefined, start: string | null | undefined, end: string | null | undefined): string {
  if (!dateISO || !start || !end) return '—'
  const [y, m, d] = dateISO.split('-')
  const monthName = MONTHS[Number(m) - 1]
  return `${Number(d)} ${monthName} ${y}, ${start.slice(0, 5)}–${end.slice(0, 5)}`
}

function wrapEmail(title: string, bodyHtml: string): string {
  return `
    <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #0A2E6B;">
      <h1 style="font-size: 22px; margin: 0 0 12px;">${title}</h1>
      ${bodyHtml}
      <p style="font-size: 13px; color: #999; margin-top: 24px;">
        Отражение · Студия автопортрета · Камышлов
      </p>
    </div>
  `
}

function buildConfirmedHtml(b: BookingDetail): string {
  const when = formatWhen(b.slot_date, b.start_time, b.end_time)
  return wrapEmail(
    'Готово. Бронь подтверждена ✓',
    `
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
    `,
  )
}

function buildCancelledHtml(b: BookingDetail): string {
  const when = formatWhen(b.slot_date, b.start_time, b.end_time)
  const refundRow =
    b.refund_kopecks !== null && b.refund_kopecks > 0
      ? `
        <tr>
          <td style="padding: 6px 0; color: #666;">Возврат</td>
          <td style="padding: 6px 0; text-align: right; font-weight: 600;">${formatMoney(b.refund_kopecks)}</td>
        </tr>
      `
      : ''
  return wrapEmail(
    'Бронь отменена',
    `
      <p style="font-size: 15px; line-height: 1.5; color: #333;">
        Привет, ${b.client_name}! Бронь в студии «Отражение» отменена.
      </p>
      <table style="width: 100%; margin: 20px 0; border-collapse: collapse; font-size: 14px;">
        <tr>
          <td style="padding: 6px 0; color: #666;">Дата и время</td>
          <td style="padding: 6px 0; text-align: right; font-weight: 600;">${when}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #666;">Код брони</td>
          <td style="padding: 6px 0; text-align: right; font-family: monospace; font-weight: 600;">${b.booking_code}</td>
        </tr>
        ${refundRow}
      </table>
      <p style="font-size: 14px; color: #666; line-height: 1.5;">
        Если это произошло по ошибке или хочешь выбрать другое время — напиши нам и укажи код брони.
      </p>
    `,
  )
}

function buildRescheduledHtml(b: BookingDetail, payload: NotifyPayload): string {
  const when = formatWhen(b.slot_date, b.start_time, b.end_time)
  const oldWhen = formatWhen(payload.old_slot_date, payload.old_start_time, payload.old_end_time)
  return wrapEmail(
    'Бронь перенесена ✓',
    `
      <p style="font-size: 15px; line-height: 1.5; color: #333;">
        Привет, ${b.client_name}! Твоя бронь в студии «Отражение» перенесена на новое время.
      </p>
      <table style="width: 100%; margin: 20px 0; border-collapse: collapse; font-size: 14px;">
        <tr>
          <td style="padding: 6px 0; color: #666;">Было</td>
          <td style="padding: 6px 0; text-align: right; color: #999; text-decoration: line-through;">${oldWhen}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #666;">Стало</td>
          <td style="padding: 6px 0; text-align: right; font-weight: 600;">${when}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #666;">Код брони</td>
          <td style="padding: 6px 0; text-align: right; font-family: monospace; font-weight: 600;">${b.booking_code}</td>
        </tr>
      </table>
      <p style="font-size: 14px; color: #666; line-height: 1.5;">
        Ждём тебя в новое время. Если это ошибка — напиши нам и укажи код брони.
      </p>
    `,
  )
}

function buildEmail(event: BookingEvent, b: BookingDetail, payload: NotifyPayload): { subject: string; html: string } {
  if (event === 'cancelled') {
    return { subject: 'Бронь отменена — Отражение', html: buildCancelledHtml(b) }
  }
  if (event === 'rescheduled') {
    return { subject: 'Бронь перенесена — Отражение', html: buildRescheduledHtml(b, payload) }
  }
  return { subject: 'Бронь подтверждена — Отражение', html: buildConfirmedHtml(b) }
}

async function sendEmail(to: string, subject: string, html: string): Promise<Record<string, unknown>> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to,
      subject,
      html,
    }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(`Resend API ${res.status}: ${JSON.stringify(body)}`)
  }
  return body
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
    const event = payload.event ?? 'confirmed'
    const { subject, html } = buildEmail(event, booking as BookingDetail, payload)
    const resendResponse = await sendEmail(booking.client_email, subject, html)
    return new Response(JSON.stringify({ ok: true, resend: resendResponse }), { status: 200 })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 200 })
  }
})
