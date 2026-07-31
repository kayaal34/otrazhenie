import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import {
  fetchPromoCodes,
  createPromoCode,
  setPromoCodeActive,
  deletePromoCode,
  AdminError,
  type PromoCodeRow,
} from '../../lib/admin'
import type { PromoDiscountType } from '../../types/database'
import { formatRub } from '../../lib/format'
import { PrimaryButton } from '../ui/PrimaryButton'

const inputClass =
  'mt-1 rounded-xl border border-border bg-surface px-3 py-2 font-body text-blue-deep outline-none transition-colors focus:border-blue-primary'

function formatDiscount(row: PromoCodeRow): string {
  return row.discount_type === 'percent' ? `${row.discount_value}%` : formatRub(row.discount_value)
}

function formatExpiry(expiresAt: string | null): string {
  if (!expiresAt) return 'бессрочно'
  return new Date(expiresAt).toLocaleDateString('ru-RU')
}

export function PromoCodesPanel() {
  const [codes, setCodes] = useState<PromoCodeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  const [code, setCode] = useState('')
  const [discountType, setDiscountType] = useState<PromoDiscountType>('percent')
  const [discountValue, setDiscountValue] = useState('')
  const [usageLimit, setUsageLimit] = useState('')
  const [expiresAt, setExpiresAt] = useState('')

  async function load() {
    setLoading(true)
    try {
      setCodes(await fetchPromoCodes())
    } catch (err) {
      toast.error(err instanceof AdminError ? err.message : 'Не удалось загрузить промокоды')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleCreate(e: FormEvent) {
    e.preventDefault()

    const value = Number(discountValue)
    if (!code.trim() || !value || value <= 0) {
      toast.error('Заполните код и величину скидки')
      return
    }
    if (discountType === 'percent' && value > 100) {
      toast.error('Процент скидки не может быть больше 100')
      return
    }

    setCreating(true)
    try {
      await createPromoCode({
        code,
        discountType,
        discountValue: discountType === 'fixed' ? Math.round(value * 100) : Math.round(value),
        usageLimit: usageLimit ? Number(usageLimit) : null,
        expiresAt: expiresAt ? new Date(`${expiresAt}T23:59:59`).toISOString() : null,
      })
      toast.success(`Промокод ${code.trim().toUpperCase()} создан`)
      setCode('')
      setDiscountValue('')
      setUsageLimit('')
      setExpiresAt('')
      await load()
    } catch (err) {
      toast.error(err instanceof AdminError ? err.message : 'Не удалось создать промокод')
    } finally {
      setCreating(false)
    }
  }

  async function handleToggleActive(row: PromoCodeRow) {
    try {
      await setPromoCodeActive(row.id, !row.is_active)
      setCodes((prev) =>
        prev.map((c) => (c.id === row.id ? { ...c, is_active: !c.is_active } : c)),
      )
    } catch (err) {
      toast.error(err instanceof AdminError ? err.message : 'Не удалось обновить промокод')
    }
  }

  async function handleDelete(row: PromoCodeRow) {
    try {
      await deletePromoCode(row.id)
      setCodes((prev) => prev.filter((c) => c.id !== row.id))
      toast.success(`Промокод ${row.code} удалён`)
    } catch (err) {
      toast.error(err instanceof AdminError ? err.message : 'Не удалось удалить промокод')
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="font-display text-lg font-semibold text-blue-deep">Новый промокод</h2>
        <form onSubmit={handleCreate} className="mt-3 grid gap-3 sm:grid-cols-4">
          <label className="flex flex-col font-body text-sm text-blue-deep">
            Код
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="WELCOME10"
              className={`${inputClass} uppercase`}
              required
            />
          </label>

          <label className="flex flex-col font-body text-sm text-blue-deep">
            Тип скидки
            <select
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as PromoDiscountType)}
              className={inputClass}
            >
              <option value="percent">Процент</option>
              <option value="fixed">Фиксированная, ₽</option>
            </select>
          </label>

          <label className="flex flex-col font-body text-sm text-blue-deep">
            {discountType === 'percent' ? 'Скидка, %' : 'Скидка, ₽'}
            <input
              type="number"
              min={1}
              max={discountType === 'percent' ? 100 : undefined}
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              className={inputClass}
              required
            />
          </label>

          <label className="flex flex-col font-body text-sm text-blue-deep">
            Лимит использований
            <input
              type="number"
              min={1}
              value={usageLimit}
              onChange={(e) => setUsageLimit(e.target.value)}
              placeholder="без лимита"
              className={inputClass}
            />
          </label>

          <label className="flex flex-col font-body text-sm text-blue-deep sm:col-span-2">
            Действует до
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className={inputClass}
            />
          </label>

          <div className="flex items-end sm:col-span-2">
            <PrimaryButton type="submit" size="sm" disabled={creating}>
              {creating ? 'Создаём…' : 'Создать промокод'}
            </PrimaryButton>
          </div>
        </form>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-blue-deep">Все промокоды</h2>
        {loading ? (
          <p className="mt-3 font-body text-sm text-blue-deep/50">Загружаем…</p>
        ) : codes.length === 0 ? (
          <p className="mt-3 font-body text-sm text-blue-deep/50">Промокодов пока нет.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {codes.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3"
              >
                <div>
                  <p className="font-mono text-sm font-semibold text-blue-deep">{row.code}</p>
                  <p className="font-body text-xs text-blue-deep/60">
                    {formatDiscount(row)} · использован {row.usage_count}
                    {row.usage_limit ? ` / ${row.usage_limit}` : ' раз'} · до{' '}
                    {formatExpiry(row.expires_at)}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(row)}
                    className={`font-body text-xs ${
                      row.is_active ? 'text-mint' : 'text-blue-deep/40'
                    } hover:underline`}
                  >
                    {row.is_active ? 'Включён' : 'Выключен'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(row)}
                    className="font-body text-xs text-coral hover:underline"
                  >
                    Удалить
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
