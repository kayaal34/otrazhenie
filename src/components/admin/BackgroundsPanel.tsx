import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import {
  fetchAllBackgroundsAdmin,
  createBackground,
  updateBackground,
  setBackgroundActive,
  deleteBackground,
  AdminError,
} from '../../lib/admin'
import type { BackgroundRow } from '../../lib/booking'
import { PrimaryButton } from '../ui/PrimaryButton'
import { useConfirm } from './ConfirmDialog'

const inputClass =
  'mt-1 rounded-xl border border-border bg-surface px-3 py-2 font-body text-blue-deep outline-none transition-colors focus:border-blue-primary'

type EditState = { name: string; sortOrder: string }

export function BackgroundsPanel() {
  const confirm = useConfirm()
  const [backgrounds, setBackgrounds] = useState<BackgroundRow[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [sortOrder, setSortOrder] = useState('0')

  const [edits, setEdits] = useState<Record<string, EditState>>({})

  async function load() {
    setLoading(true)
    try {
      const data = await fetchAllBackgroundsAdmin()
      setBackgrounds(data)
      setEdits(
        Object.fromEntries(
          data.map((b) => [b.id, { name: b.name, sortOrder: String(b.sort_order) }]),
        ),
      )
    } catch (err) {
      toast.error(err instanceof AdminError ? err.message : 'Не удалось загрузить фоны')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleCreate(e: FormEvent) {
    e.preventDefault()

    if (!name.trim()) {
      toast.error('Укажите название фона')
      return
    }

    setCreating(true)
    try {
      await createBackground({ name: name.trim(), sortOrder: Number(sortOrder) || 0 })
      toast.success(`Фон «${name.trim()}» добавлен`)
      setName('')
      setSortOrder('0')
      await load()
    } catch (err) {
      toast.error(err instanceof AdminError ? err.message : 'Не удалось добавить фон')
    } finally {
      setCreating(false)
    }
  }

  async function handleSave(bg: BackgroundRow) {
    const edit = edits[bg.id]
    if (!edit || !edit.name.trim()) {
      toast.error('Укажите название фона')
      return
    }

    setSavingId(bg.id)
    try {
      await updateBackground(bg.id, {
        name: edit.name.trim(),
        sortOrder: Number(edit.sortOrder) || 0,
      })
      toast.success('Фон обновлён')
      await load()
    } catch (err) {
      toast.error(err instanceof AdminError ? err.message : 'Не удалось обновить фон')
    } finally {
      setSavingId(null)
    }
  }

  async function handleToggleActive(bg: BackgroundRow) {
    try {
      await setBackgroundActive(bg.id, !bg.is_active)
      setBackgrounds((prev) =>
        prev.map((b) => (b.id === bg.id ? { ...b, is_active: !b.is_active } : b)),
      )
    } catch (err) {
      toast.error(err instanceof AdminError ? err.message : 'Не удалось обновить фон')
    }
  }

  async function handleDelete(bg: BackgroundRow) {
    const ok = await confirm({
      title: 'Удалить фон?',
      message: `Фон «${bg.name}» больше не будет доступен для новых броней.`,
      confirmLabel: 'Удалить',
      danger: true,
    })
    if (!ok) return

    try {
      await deleteBackground(bg.id)
      setBackgrounds((prev) => prev.filter((b) => b.id !== bg.id))
      toast.success(`Фон «${bg.name}» удалён`)
    } catch (err) {
      toast.error(err instanceof AdminError ? err.message : 'Не удалось удалить фон')
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="font-display text-lg font-semibold text-blue-deep">Новый фон</h2>
        <form onSubmit={handleCreate} className="mt-3 grid gap-3 sm:grid-cols-4">
          <label className="flex flex-col font-body text-sm text-blue-deep sm:col-span-2">
            Название
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Розовая ткань"
              className={inputClass}
              required
            />
          </label>

          <label className="flex flex-col font-body text-sm text-blue-deep">
            Порядок
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className={inputClass}
            />
          </label>

          <div className="flex items-end">
            <PrimaryButton type="submit" size="sm" disabled={creating}>
              {creating ? 'Добавляем…' : 'Добавить фон'}
            </PrimaryButton>
          </div>
        </form>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-blue-deep">Все фоны</h2>
        {loading ? (
          <p className="mt-3 font-body text-sm text-blue-deep/50">Загружаем…</p>
        ) : backgrounds.length === 0 ? (
          <p className="mt-3 font-body text-sm text-blue-deep/50">
            Фонов нет — клиенты не смогут выбрать фон при бронировании.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {backgrounds.map((bg) => {
              const edit = edits[bg.id] ?? { name: bg.name, sortOrder: String(bg.sort_order) }
              return (
                <li
                  key={bg.id}
                  className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface px-4 py-3"
                >
                  <label className="flex flex-col font-body text-xs text-blue-deep/70">
                    Название
                    <input
                      type="text"
                      value={edit.name}
                      onChange={(e) =>
                        setEdits((prev) => ({
                          ...prev,
                          [bg.id]: { ...edit, name: e.target.value },
                        }))
                      }
                      className={`${inputClass} w-40`}
                    />
                  </label>

                  <label className="flex flex-col font-body text-xs text-blue-deep/70">
                    Порядок
                    <input
                      type="number"
                      value={edit.sortOrder}
                      onChange={(e) =>
                        setEdits((prev) => ({
                          ...prev,
                          [bg.id]: { ...edit, sortOrder: e.target.value },
                        }))
                      }
                      className={`${inputClass} w-20`}
                    />
                  </label>

                  <button
                    type="button"
                    disabled={savingId === bg.id}
                    onClick={() => handleSave(bg)}
                    className="font-body text-xs text-mint hover:underline disabled:opacity-50"
                  >
                    {savingId === bg.id ? 'Сохраняем…' : 'Сохранить'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleActive(bg)}
                    className={`font-body text-xs ${
                      bg.is_active ? 'text-mint' : 'text-blue-deep/40'
                    } hover:underline`}
                  >
                    {bg.is_active ? 'Включён' : 'Выключен'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(bg)}
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
