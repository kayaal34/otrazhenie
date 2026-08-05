import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  fetchGiftCertificates,
  fetchTrashedCertificates,
  confirmCertificatePayment,
  resendCertificateEmail,
  trashCertificate,
  restoreCertificate,
  permanentlyDeleteCertificate,
  emptyCertificateTrash,
  CertificateError,
  type GiftCertificateRow,
} from '../../lib/certificates'
import { formatDateTime, formatRub } from '../../lib/format'
import { useConfirm } from './ConfirmDialog'

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

type View = 'active' | 'trash'

export function CertificatesPanel() {
  const confirmDialog = useConfirm()
  const [view, setView] = useState<View>('active')
  const [certificates, setCertificates] = useState<GiftCertificateRow[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [resendingId, setResendingId] = useState<string | null>(null)
  const [trashingId, setTrashingId] = useState<string | null>(null)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [emptying, setEmptying] = useState(false)

  async function load(v: View) {
    setLoading(true)
    try {
      const data = v === 'active' ? await fetchGiftCertificates() : await fetchTrashedCertificates()
      setCertificates(data)
    } catch (err) {
      toast.error(err instanceof CertificateError ? err.message : 'Не удалось загрузить сертификаты')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(view)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view])

  async function handleConfirm(cert: GiftCertificateRow) {
    setConfirmingId(cert.id)
    try {
      await confirmCertificatePayment(cert.id)
      toast.success(`Сертификат ${cert.code} подтверждён — письмо отправляется на ${cert.buyer_email}`)
      await load(view)
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

  async function handleTrash(cert: GiftCertificateRow) {
    const ok = await confirmDialog({
      title: 'Удалить сертификат?',
      message: `Сертификат ${cert.code} (${cert.recipient_name}) переместится в «Корзину» и пропадёт из этого списка.`,
      confirmLabel: 'Удалить',
      danger: true,
    })
    if (!ok) return

    setTrashingId(cert.id)
    try {
      await trashCertificate(cert.id)
      setCertificates((prev) => prev.filter((c) => c.id !== cert.id))
      toast.success(`Сертификат ${cert.code} перемещён в корзину`)
    } catch (err) {
      toast.error(err instanceof CertificateError ? err.message : 'Не удалось удалить сертификат')
    } finally {
      setTrashingId(null)
    }
  }

  async function handleRestore(cert: GiftCertificateRow) {
    setRestoringId(cert.id)
    try {
      await restoreCertificate(cert.id)
      setCertificates((prev) => prev.filter((c) => c.id !== cert.id))
      toast.success(`Сертификат ${cert.code} восстановлен`)
    } catch (err) {
      toast.error(err instanceof CertificateError ? err.message : 'Не удалось восстановить сертификат')
    } finally {
      setRestoringId(null)
    }
  }

  async function handleDeleteForever(cert: GiftCertificateRow) {
    const ok = await confirmDialog({
      title: 'Удалить сертификат навсегда?',
      message: `Сертификат ${cert.code} (${cert.recipient_name}) будет стёрт безвозвратно. Восстановить его будет уже нельзя.`,
      confirmLabel: 'Удалить навсегда',
      danger: true,
    })
    if (!ok) return

    setDeletingId(cert.id)
    try {
      await permanentlyDeleteCertificate(cert.id)
      setCertificates((prev) => prev.filter((c) => c.id !== cert.id))
      toast.success(`Сертификат ${cert.code} удалён навсегда`)
    } catch (err) {
      toast.error(err instanceof CertificateError ? err.message : 'Не удалось удалить сертификат')
    } finally {
      setDeletingId(null)
    }
  }

  async function handleEmptyTrash() {
    const ok = await confirmDialog({
      title: 'Очистить корзину навсегда?',
      message: `Будут безвозвратно удалены ВСЕ сертификаты в корзине (${certificates.length} шт.). Отменить это действие нельзя.`,
      confirmLabel: 'Очистить корзину',
      danger: true,
    })
    if (!ok) return

    setEmptying(true)
    try {
      const count = await emptyCertificateTrash()
      setCertificates([])
      toast.success(count > 0 ? `Удалено навсегда: ${count}` : 'Корзина уже пуста')
    } catch (err) {
      toast.error(err instanceof CertificateError ? err.message : 'Не удалось очистить корзину')
    } finally {
      setEmptying(false)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {(
            [
              { key: 'active', label: 'Активные' },
              { key: 'trash', label: 'Корзина' },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setView(t.key)}
              className={`rounded-full px-3 py-1.5 font-body text-sm transition-colors ${
                view === t.key
                  ? 'bg-blue-primary text-white'
                  : 'border border-border text-blue-deep/70 hover:border-blue-primary'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {view === 'trash' && (
          <button
            type="button"
            disabled={emptying || certificates.length === 0}
            onClick={handleEmptyTrash}
            className="shrink-0 rounded-full bg-coral px-4 py-2 font-body text-sm font-medium text-white transition-colors hover:bg-coral/90 disabled:opacity-50"
          >
            {emptying ? 'Очищаем…' : 'Очистить корзину навсегда'}
          </button>
        )}
      </div>

      {loading ? (
        <p className="mt-4 font-body text-sm text-blue-deep/50">Загружаем…</p>
      ) : certificates.length === 0 ? (
        <p className="mt-4 font-body text-sm text-blue-deep/50">
          {view === 'active' ? 'Сертификатов пока не покупали.' : 'Корзина пуста.'}
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
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
                  {cert.deleted_at && <> · удалён {formatDateTime(cert.deleted_at)}</>}
                </span>

                <div className="flex items-center gap-3">
                  {view === 'active' ? (
                    <>
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
                      <button
                        type="button"
                        disabled={trashingId === cert.id}
                        onClick={() => handleTrash(cert)}
                        className="font-body text-xs text-blue-deep/40 hover:text-coral disabled:opacity-50"
                      >
                        {trashingId === cert.id ? 'Удаляем…' : 'Удалить'}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={restoringId === cert.id}
                        onClick={() => handleRestore(cert)}
                        className="font-body text-xs text-mint hover:underline disabled:opacity-50"
                      >
                        {restoringId === cert.id ? 'Восстанавливаем…' : 'Восстановить'}
                      </button>
                      <button
                        type="button"
                        disabled={deletingId === cert.id}
                        onClick={() => handleDeleteForever(cert)}
                        className="font-body text-xs text-coral hover:underline disabled:opacity-50"
                      >
                        {deletingId === cert.id ? 'Удаляем…' : 'Удалить навсегда'}
                      </button>
                    </>
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
