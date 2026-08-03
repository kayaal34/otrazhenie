// Supabase Edge Function (Deno). Вызывается триггером БД (см.
// supabase/patch_017_gift_certificates.sql) когда администратор
// подтверждает оплату подарочного сертификата — отправляет покупателю
// письмо с кодом сертификата через Resend.
//
// Секреты — те же, что у send-booking-email (Supabase Dashboard →
// Edge Functions → send-certificate-email → Secrets, либо
// `supabase secrets set`):
//   RESEND_API_KEY, EMAIL_FROM, WEBHOOK_SHARED_SECRET
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
  certificate_id: string
}

type CertificateRow = {
  code: string
  duration_hours: number
  price_kopecks: number
  buyer_name: string
  buyer_email: string
}

function formatMoney(kopecks: number): string {
  return new Intl.NumberFormat('ru-RU').format(Math.round(kopecks / 100)) + ' ₽'
}

function buildHtml(c: CertificateRow): string {
  return `
    <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #0A2E6B;">
      <h1 style="font-size: 22px; margin: 0 0 12px;">Ваш подарочный сертификат готов ✓</h1>
      <p style="font-size: 15px; line-height: 1.5; color: #333;">
        Привет, ${c.buyer_name}! Мы получили оплату — сертификат в студию «Отражение» готов.
      </p>
      <table style="width: 100%; margin: 20px 0; border-collapse: collapse; font-size: 14px;">
        <tr>
          <td style="padding: 6px 0; color: #666;">Код сертификата</td>
          <td style="padding: 6px 0; text-align: right; font-family: monospace; font-weight: 600; font-size: 16px;">${c.code}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #666;">Длительность</td>
          <td style="padding: 6px 0; text-align: right; font-weight: 600;">${c.duration_hours} ч</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #666;">Номинал</td>
          <td style="padding: 6px 0; text-align: right; font-weight: 600;">${formatMoney(c.price_kopecks)}</td>
        </tr>
      </table>
      <p style="font-size: 14px; color: #666; line-height: 1.5;">
        Чтобы воспользоваться сертификатом, назовите этот код администратору студии при
        бронировании — по телефону, в Telegram или WhatsApp. Срок действия — без ограничения.
      </p>
      <p style="font-size: 13px; color: #999; margin-top: 24px;">
        Отражение · Студия автопортрета · Камышлов
      </p>
    </div>
  `
}

async function sendEmail(to: string, html: string): Promise<Record<string, unknown>> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to,
      subject: 'Ваш подарочный сертификат — Отражение',
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

  const { data: certificate, error } = await supabase
    .from('gift_certificates')
    .select('code, duration_hours, price_kopecks, buyer_name, buyer_email')
    .eq('id', payload.certificate_id)
    .single()

  if (error || !certificate) {
    console.error('certificate not found', payload.certificate_id, error)
    return new Response(JSON.stringify({ ok: false, error: 'certificate not found' }), { status: 200 })
  }

  try {
    const resendResponse = await sendEmail(certificate.buyer_email, buildHtml(certificate as CertificateRow))
    await supabase
      .from('gift_certificates')
      .update({ email_sent_at: new Date().toISOString() })
      .eq('id', payload.certificate_id)
    return new Response(JSON.stringify({ ok: true, resend: resendResponse }), { status: 200 })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 200 })
  }
})
