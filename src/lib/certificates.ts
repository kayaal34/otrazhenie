import { supabase } from './supabase'
import type { GiftCertificateStatus } from '../types/database'

export class CertificateError extends Error {}

function mapCertificateRpcError(raw: string): CertificateError {
  if (raw.includes('NO_PRICING_RULE_FOR_DURATION')) {
    return new CertificateError('Для этой длительности пока не задана цена. Свяжитесь со студией.')
  }
  return new CertificateError('Что-то пошло не так. Попробуйте ещё раз.')
}

export type NewGiftCertificate = {
  durationHours: number
  recipientName: string
  buyerName: string
  buyerPhone: string
  buyerEmail: string
}

export type CreateCertificateResult = {
  certificateId: string
  code: string
  priceKopecks: number
}

/** Покупка сертификата — публичный вызов, доступен без входа в систему. */
export async function createGiftCertificate(
  input: NewGiftCertificate,
): Promise<CreateCertificateResult> {
  const { data, error } = await supabase.rpc('create_gift_certificate', {
    p_duration_hours: input.durationHours,
    p_recipient_name: input.recipientName,
    p_buyer_name: input.buyerName,
    p_buyer_phone: input.buyerPhone,
    p_buyer_email: input.buyerEmail,
  })

  if (error) throw mapCertificateRpcError(error.message)

  const row = data?.[0]
  if (!row) throw new CertificateError('Что-то пошло не так. Попробуйте ещё раз.')

  return {
    certificateId: row.certificate_id,
    code: row.code,
    priceKopecks: row.price_kopecks,
  }
}

// -------------------------------------------------------------------------
// Админ
// -------------------------------------------------------------------------

export type GiftCertificateRow = {
  id: string
  code: string
  duration_hours: number
  price_kopecks: number
  recipient_name: string
  buyer_name: string
  buyer_phone: string
  buyer_email: string
  status: GiftCertificateStatus
  payment_provider: string | null
  paid_at: string | null
  email_sent_at: string | null
  created_at: string
  deleted_at: string | null
}

export async function fetchGiftCertificates(): Promise<GiftCertificateRow[]> {
  const { data, error } = await supabase
    .from('gift_certificates')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw new CertificateError(error.message)
  return data ?? []
}

export async function fetchTrashedCertificates(): Promise<GiftCertificateRow[]> {
  const { data, error } = await supabase
    .from('gift_certificates')
    .select('*')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })

  if (error) throw new CertificateError(error.message)
  return data ?? []
}

/** Поштучное удаление сертификата — не стирает запись, а перемещает в «Корзину». */
export async function trashCertificate(certificateId: string): Promise<void> {
  const { error } = await supabase
    .from('gift_certificates')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', certificateId)

  if (error) throw new CertificateError(error.message)
}

export async function restoreCertificate(certificateId: string): Promise<void> {
  const { error } = await supabase
    .from('gift_certificates')
    .update({ deleted_at: null })
    .eq('id', certificateId)

  if (error) throw new CertificateError(error.message)
}

/** Безвозвратное удаление одного сертификата из «Корзины». */
export async function permanentlyDeleteCertificate(certificateId: string): Promise<void> {
  const { error } = await supabase.from('gift_certificates').delete().eq('id', certificateId)
  if (error) throw new CertificateError(error.message)
}

/** Безвозвратно стирает ВСЕ сертификаты, лежащие в «Корзине». */
export async function emptyCertificateTrash(): Promise<number> {
  const { data, error } = await supabase.rpc('admin_empty_certificate_trash')
  if (error) throw new CertificateError(error.message)
  return data ?? 0
}

export async function confirmCertificatePayment(certificateId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_confirm_certificate_payment', {
    p_certificate_id: certificateId,
  })
  if (error) throw new CertificateError(error.message)
}

export async function resendCertificateEmail(certificateId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_resend_certificate_email', {
    p_certificate_id: certificateId,
  })
  if (error) throw new CertificateError(error.message)
}
