import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import {
  fetchAllPricingRules,
  createPricingRule,
  updatePricingRule,
  deletePricingRule,
  AdminError,
} from '../../lib/admin'
import type { PricingRuleRow } from '../../lib/booking'
import { formatRub } from '../../lib/format'
import { PrimaryButton } from '../ui/PrimaryButton'
import { useConfirm } from './ConfirmDialog'

const inputClass =
  'mt-1 rounded-xl border border-border bg-surface px-3 py-2 font-body text-blue-deep outline-none transition-colors focus:border-blue-primary'

type EditState = { priceRub: string; label: string }

export function PricingRulesPanel() {
  const confirm = useConfirm()
  const [rules, setRules] = useState<PricingRuleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [savingKey, setSavingKey] = useState<number | null>(null)

  const [durationHours, setDurationHours] = useState('')
  const [priceRub, setPriceRub] = useState('')
  const [label, setLabel] = useState('')

  const [edits, setEdits] = useState<Record<number, EditState>>({})

  async function load() {
    setLoading(true)
    try {
      const data = await fetchAllPricingRules()
      setRules(data)
      setEdits(
        Object.fromEntries(
          data.map((r) => [
            r.duration_hours,
            { priceRub: String(r.price_kopecks / 100), label: r.label },
          ]),
        ),
      )
    } catch (err) {
      toast.error(err instanceof AdminError ? err.message : 'Не удалось загрузить тарифы')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleCreate(e: FormEvent) {
    e.preventDefault()

    const hours = Number(durationHours)
    const price = Number(priceRub)
    if (!hours || hours <= 0 || !price || price <= 0 || !label.trim()) {
      toast.error('Заполните длительность, цену и название тарифа')
      return
    }

    setCreating(true)
    try {
      await createPricingRule({
        durationHours: Math.round(hours),
        priceKopecks: Math.round(price * 100),
        label: label.trim(),
      })
      toast.success(`Тариф «${label.trim()}» создан`)
      setDurationHours('')
      setPriceRub('')
      setLabel('')
      await load()
    } catch (err) {
      toast.error(err instanceof AdminError ? err.message : 'Не удалось создать тариф')
    } finally {
      setCreating(false)
    }
  }

  async function handleSave(rule: PricingRuleRow) {
    const edit = edits[rule.duration_hours]
    const price = Number(edit?.priceRub)
    if (!edit || !price || price <= 0 || !edit.label.trim()) {
      toast.error('Заполните цену и название тарифа')
      return
    }

    setSavingKey(rule.duration_hours)
    try {
      await updatePricingRule(rule.duration_hours, {
        priceKopecks: Math.round(price * 100),
        label: edit.label.trim(),
      })
      toast.success('Тариф обновлён')
      await load()
    } catch (err) {
      toast.error(err instanceof AdminError ? err.message : 'Не удалось обновить тариф')
    } finally {
      setSavingKey(null)
    }
  }

  async function handleDelete(rule: PricingRuleRow) {
    const ok = await confirm({
      title: 'Удалить тариф?',
      message: `Тариф «${rule.label}» (${rule.duration_hours} ч) больше не будет доступен для новых броней.`,
      confirmLabel: 'Удалить',
      danger: true,
    })
    if (!ok) return

    try {
      await deletePricingRule(rule.duration_hours)
      setRules((prev) => prev.filter((r) => r.duration_hours !== rule.duration_hours))
      toast.success(`Тариф «${rule.label}» удалён`)
    } catch (err) {
      toast.error(err instanceof AdminError ? err.message : 'Не удалось удалить тариф')
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="font-display text-lg font-semibold text-blue-deep">Новый тариф</h2>
        <form onSubmit={handleCreate} className="mt-3 grid gap-3 sm:grid-cols-4">
          <label className="flex flex-col font-body text-sm text-blue-deep">
            Длительность, ч
            <input
              type="number"
              min={1}
              value={durationHours}
              onChange={(e) => setDurationHours(e.target.value)}
              className={inputClass}
              required
            />
          </label>

          <label className="flex flex-col font-body text-sm text-blue-deep">
            Название
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="1 час"
              className={inputClass}
              required
            />
          </label>

          <label className="flex flex-col font-body text-sm text-blue-deep">
            Цена, ₽
            <input
              type="number"
              min={1}
              value={priceRub}
              onChange={(e) => setPriceRub(e.target.value)}
              className={inputClass}
              required
            />
          </label>

          <div className="flex items-end">
            <PrimaryButton type="submit" size="sm" disabled={creating}>
              {creating ? 'Создаём…' : 'Создать тариф'}
            </PrimaryButton>
          </div>
        </form>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-blue-deep">Все тарифы</h2>
        {loading ? (
          <p className="mt-3 font-body text-sm text-blue-deep/50">Загружаем…</p>
        ) : rules.length === 0 ? (
          <p className="mt-3 font-body text-sm text-blue-deep/50">
            Тарифов нет — клиенты не смогут ничего забронировать, пока вы не создадите хотя бы
            один.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {rules.map((rule) => {
              const edit = edits[rule.duration_hours] ?? {
                priceRub: String(rule.price_kopecks / 100),
                label: rule.label,
              }
              return (
                <li
                  key={rule.duration_hours}
                  className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface px-4 py-3"
                >
                  <span className="font-mono text-sm text-blue-deep/60">
                    {rule.duration_hours} ч
                  </span>

                  <label className="flex flex-col font-body text-xs text-blue-deep/70">
                    Название
                    <input
                      type="text"
                      value={edit.label}
                      onChange={(e) =>
                        setEdits((prev) => ({
                          ...prev,
                          [rule.duration_hours]: { ...edit, label: e.target.value },
                        }))
                      }
                      className={`${inputClass} w-40`}
                    />
                  </label>

                  <label className="flex flex-col font-body text-xs text-blue-deep/70">
                    Цена, ₽
                    <input
                      type="number"
                      min={1}
                      value={edit.priceRub}
                      onChange={(e) =>
                        setEdits((prev) => ({
                          ...prev,
                          [rule.duration_hours]: { ...edit, priceRub: e.target.value },
                        }))
                      }
                      className={`${inputClass} w-28`}
                    />
                  </label>

                  <span className="font-body text-xs text-blue-deep/40">
                    сейчас: {formatRub(rule.price_kopecks)}
                  </span>

                  <button
                    type="button"
                    disabled={savingKey === rule.duration_hours}
                    onClick={() => handleSave(rule)}
                    className="font-body text-xs text-mint hover:underline disabled:opacity-50"
                  >
                    {savingKey === rule.duration_hours ? 'Сохраняем…' : 'Сохранить'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(rule)}
                    className="font-body text-xs text-coral hover:underline"
                  >
                    Удалить
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
