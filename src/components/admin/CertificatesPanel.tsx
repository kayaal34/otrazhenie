import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  fetchGiftCertificates,
  confirmCertificatePayment,
  resendCertificateEmail,
  CertificateError,
  type GiftCertificateRow,
} from '../../lib/certificates'
import { formatDateTime, formatRub } from '../../lib/format'

const STATUS_LABEL: Record<GiftCertificateRow['status'], string> = {
  pending_payment: 'Ожидает оплаты',
  confirmed: 'Подтверждён',
  cancelled: 'Отменён',
}

const STATUS_CLASS: Record<GiftCertificateRow['status'], string> = {
  pending_payment: 'bg-amber/20 text-blue-deep',
  confirmed: 'bg-mint/15 text-mint',
  cancelled: 'bg-coral/15 text-coral',
}

export function CertificatesPanel() {
  const [certificates, setCertificates] = useState<GiftCertificateRow[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [resendingId, setResendingId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const data = await fetchGiftCertificates()
      setCertificates(data)
    } catch (err) {
      toast.error(err instanceof CertificateError ? err.message : 'Не удалось загрузить сертификаты')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleConfirm(cert: GiftCertificateRow) {
    setConfirmingId(cert.id)
    try {
      await confirmCertificatePayment(cert.id)
      toast.success(`Сертификат ${cert.code} подтверждён — письмо отправляется на ${cert.buyer_email}`)
      await load()
    } catch (err) {
      toast.error(err instanceof CertificateError ? err.message : 'Не удалось подтвердить оплату')
    } finally {
      setConfirmingId(null)
    }
  }

  async function handleResend(cert: GiftCertificateRow) {
    setResendingId(cert.id)
    try {
      await resendCertificateEmail(cert.id)
      toast.success(`Письмо повторно отправлено на ${cert.buyer_email}`)
    } catch (err) {
      toast.error(err instanceof CertificateError ? err.message : 'Не удалось отправить письмо')
    } finally {
      setResendingId(null)
    }
  }

  return (
    <div>
      {loading ? (
        <p className="font-body text-sm text-blue-deep/50">Загружаем…</p>
      ) : certificates.length === 0 ? (
        <p className="font-body text-sm text-blue-deep/50">Сертификатов пока не покупали.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {certificates.map((cert) => (
            <li key={cert.id} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-sm font-semibold text-blue-deep">{cert.code}</span>
                <span className={`rounded-full px-2 py-0.5 font-body text-xs ${STATUS_CLASS[cert.status]}`}>
                  {STATUS_LABEL[cert.status]}
                </span>
              </div>

              <div className="mt-2 grid gap-1 font-body text-sm text-blue-deep/80 sm:grid-cols-2">
                <p className="font-medium">Кому: {cert.recipient_name}</p>
                <p>Покупатель: {cert.buyer_name}</p>
                <p>{cert.buyer_phone}</p>
                <p>{cert.buyer_email}</p>
                <p>{cert.duration_hours} ч</p>
                <p className="font-mono">{formatRub(cert.price_kopecks)}</p>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-xs text-blue-deep/40">
                  куплен {formatDateTime(cert.created_at)}
                  {cert.email_sent_at && <> · письмо отправлено {formatDateTime(cert.email_sent_at)}</>}
                </span>

                <div className="flex items-center gap-3">
                  {cert.status === 'pending_payment' && (
                    <button
                      type="button"
                      disabled={confirmingId === cert.id}
                      onClick={() => handleConfirm(cert)}
                      className="font-body text-xs text-mint hover:underline disabled:opacity-50"
                    >
                      {confirmingId === cert.id ? 'Подтверждаем…' : 'Подтвердить оплату'}
                    </button>
                  )}
                  {cert.status === 'confirmed' && (
                    <button
                      type="button"
                      disabled={resendingId === cert.id}
                      onClick={() => handleResend(cert)}
                      className="font-body text-xs text-blue-primary hover:underline disabled:opacity-50"
                    >
                      {resendingId === cert.id ? 'Отправляем…' : 'Отправить письмо повторно'}
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
