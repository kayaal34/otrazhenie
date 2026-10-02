import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import {
  fetchAllFaqAdmin,
  createFaq,
  updateFaq,
  setFaqOrder,
  setFaqPublished,
  deleteFaq,
  FaqError,
  type FaqRow,
} from '../../lib/faq'
import { PrimaryButton } from '../ui/PrimaryButton'
import { useConfirm } from './ConfirmDialog'

const inputClass =
  'mt-1 rounded-xl border border-border bg-surface px-3 py-2 font-body text-blue-deep outline-none transition-colors focus:border-blue-primary'

const arrowClass =
  'flex h-8 w-8 items-center justify-center rounded-full border border-border font-body text-sm text-blue-deep transition-colors hover:border-blue-primary disabled:opacity-30 disabled:hover:border-border'

type EditState = { question: string; answer: string }

export function FaqPanel() {
  const confirm = useConfirm()
  const [items, setItems] = useState<FaqRow[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [reordering, setReordering] = useState(false)

  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')

  const [edits, setEdits] = useState<Record<string, EditState>>({})

  async function load() {
    setLoading(true)
    try {
      const data = await fetchAllFaqAdmin()
      setItems(data)
      setEdits(Object.fromEntries(data.map((f) => [f.id, { question: f.question, answer: f.answer }])))
    } catch (err) {
      toast.error(err instanceof FaqError ? err.message : 'Не удалось загрузить вопросы')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleCreate(e: FormEvent) {
    e.preventDefault()

    if (!question.trim() || !answer.trim()) {
      toast.error('Заполните вопрос и ответ')
      return
    }

    setCreating(true)
    try {
      const nextOrder = items.reduce((m, f) => Math.max(m, f.sort_order), 0) + 1
      await createFaq({ question: question.trim(), answer: answer.trim() }, nextOrder)
      toast.success('Вопрос добавлен в конец списка')
      setQuestion('')
      setAnswer('')
      await load()
    } catch (err) {
      toast.error(err instanceof FaqError ? err.message : 'Не удалось добавить вопрос')
    } finally {
      setCreating(false)
    }
  }

  async function handleSave(item: FaqRow) {
    const edit = edits[item.id]
    if (!edit || !edit.question.trim() || !edit.answer.trim()) {
      toast.error('Заполните вопрос и ответ')
      return
    }

    setSavingId(item.id)
    try {
      await updateFaq(item.id, { question: edit.question.trim(), answer: edit.answer.trim() })
      toast.success('Вопрос обновлён')
      setItems((prev) =>
        prev.map((f) =>
          f.id === item.id ? { ...f, question: edit.question.trim(), answer: edit.answer.trim() } : f,
        ),
      )
    } catch (err) {
      toast.error(err instanceof FaqError ? err.message : 'Не удалось сохранить вопрос')
    } finally {
      setSavingId(null)
    }
  }

  /**
   * Сдвигает вопрос на одну позицию и перенумеровывает весь список 1..N —
   * так порядок всегда однозначный, без одинаковых и «дырявых» номеров.
   * Несохранённые правки текста в других вопросах не сбрасываются.
   */
  async function handleMove(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= items.length) return

    const reordered = [...items]
    ;[reordered[index], reordered[target]] = [reordered[target], reordered[index]]
    const renumbered = reordered.map((f, i) => ({ ...f, sort_order: i + 1 }))
    const changed = renumbered.filter(
      (f) => f.sort_order !== items.find((x) => x.id === f.id)?.sort_order,
    )

    const previous = items
    setItems(renumbered)
    setReordering(true)
    try {
      await Promise.all(changed.map((f) => setFaqOrder(f.id, f.sort_order)))
    } catch (err) {
      setItems(previous)
      toast.error(err instanceof FaqError ? err.message : 'Не удалось изменить порядок')
    } finally {
      setReordering(false)
    }
  }

  async function handleTogglePublished(item: FaqRow) {
    try {
      await setFaqPublished(item.id, !item.is_published)
      setItems((prev) =>
        prev.map((f) => (f.id === item.id ? { ...f, is_published: !f.is_published } : f)),
      )
    } catch (err) {
      toast.error(err instanceof FaqError ? err.message : 'Не удалось обновить вопрос')
    }
  }

  async function handleDelete(item: FaqRow) {
    const ok = await confirm({
      title: 'Удалить вопрос?',
      message: `Вопрос «${item.question}» будет удалён с сайта безвозвратно. Если он может понадобиться позже — лучше просто скройте его.`,
      confirmLabel: 'Удалить',
      danger: true,
    })
    if (!ok) return

    try {
      await deleteFaq(item.id)
      setItems((prev) => prev.filter((f) => f.id !== item.id))
      toast.success('Вопрос удалён')
    } catch (err) {
      toast.error(err instanceof FaqError ? err.message : 'Не удалось удалить вопрос')
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="font-display text-lg font-semibold text-blue-deep">Новый вопрос</h2>
        <form onSubmit={handleCreate} className="mt-3 grid gap-3">
          <label className="flex flex-col font-body text-sm text-blue-deep">
            Вопрос
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className={inputClass}
              required
            />
          </label>

          <label className="flex flex-col font-body text-sm text-blue-deep">
            Ответ
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={4}
              className={inputClass}
              required
            />
            <span className="mt-1 font-body text-xs text-blue-deep/50">
              Чтобы сделать список, начните каждую строку с «- ». Новый вопрос добавляется в конец —
              потом его можно поднять стрелками.
            </span>
          </label>

          <div>
            <PrimaryButton type="submit" size="sm" disabled={creating}>
              {creating ? 'Добавляем…' : 'Добавить вопрос'}
            </PrimaryButton>
          </div>
        </form>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-blue-deep">Все вопросы</h2>
        <p className="mt-1 font-body text-xs text-blue-deep/60">
          Порядок на сайте такой же, как в этом списке — меняйте его стрелками ↑ ↓. Порядок
          сохраняется сразу. Скрытые вопросы на сайте не показываются.
        </p>
        {loading ? (
          <p className="mt-3 font-body text-sm text-blue-deep/50">Загружаем…</p>
        ) : items.length === 0 ? (
          <p className="mt-3 font-body text-sm text-blue-deep/50">
            Вопросов нет — блок «Частые вопросы» на главной не показывается.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {items.map((item, index) => {
              const edit = edits[item.id] ?? { question: item.question, answer: item.answer }
              const update = (patch: Partial<EditState>) =>
                setEdits((prev) => ({ ...prev, [item.id]: { ...edit, ...patch } }))
              return (
                <li
                  key={item.id}
                  className="flex gap-3 rounded-xl border border-border bg-surface p-4"
                >
                  <div className="flex flex-col items-center gap-1 pt-1">
                    <button
                      type="button"
                      aria-label="Поднять выше"
                      disabled={reordering || index === 0}
                      onClick={() => handleMove(index, -1)}
                      className={arrowClass}
                    >
                      ↑
                    </button>
                    <span className="font-mono text-xs text-blue-deep/40">{index + 1}</span>
                    <button
                      type="button"
                      aria-label="Опустить ниже"
                      disabled={reordering || index === items.length - 1}
                      onClick={() => handleMove(index, 1)}
                      className={arrowClass}
                    >
                      ↓
                    </button>
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col gap-3">
                    <label className="flex flex-col font-body text-xs text-blue-deep/70">
                      Вопрос
                      <input
                        type="text"
                        value={edit.question}
                        onChange={(e) => update({ question: e.target.value })}
                        className={inputClass}
                      />
                    </label>

                    <label className="flex flex-col font-body text-xs text-blue-deep/70">
                      Ответ
                      <textarea
                        value={edit.answer}
                        onChange={(e) => update({ answer: e.target.value })}
                        rows={Math.min(10, Math.max(3, edit.answer.split('\n').length + 1))}
                        className={inputClass}
                      />
                    </label>

                    <div className="flex flex-wrap items-center gap-4">
                      <button
                        type="button"
                        disabled={savingId === item.id}
                        onClick={() => handleSave(item)}
                        className="font-body text-xs text-mint hover:underline disabled:opacity-50"
                      >
                        {savingId === item.id ? 'Сохраняем…' : 'Сохранить'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleTogglePublished(item)}
                        className={`font-body text-xs ${
                          item.is_published ? 'text-mint' : 'text-blue-deep/40'
                        } hover:underline`}
                      >
                        {item.is_published ? 'Показан на сайте' : 'Скрыт'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        className="font-body text-xs text-coral hover:underline"
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
