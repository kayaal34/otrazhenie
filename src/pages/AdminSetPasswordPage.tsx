import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import { PrimaryButton } from '../components/ui/PrimaryButton'

const inputClass =
  'mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 font-body text-blue-deep outline-none transition-colors focus:border-blue-primary'
const labelClass = 'block font-body text-sm font-medium text-blue-deep'

export function AdminSetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('Пароль должен быть не короче 6 символов.')
      return
    }
    if (password !== confirmPassword) {
      setError('Пароли не совпадают.')
      return
    }

    setSubmitting(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      toast.success('Пароль установлен')
      navigate('/admin')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Не удалось установить пароль. Возможно, ссылка-приглашение устарела.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="mx-auto max-w-sm px-4 py-20 sm:px-6">
      <h1 className="text-center font-display text-2xl font-semibold text-blue-deep">
        Установите пароль
      </h1>
      <p className="mt-2 text-center font-body text-sm text-blue-deep/70">
        Вас пригласили администратором студии «Отражение». Придумайте пароль для входа.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <div>
          <label className={labelClass} htmlFor="password">
            Новый пароль
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="confirmPassword">
            Повторите пароль
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputClass}
          />
        </div>

        {error && <p className="font-body text-xs text-coral">{error}</p>}

        <PrimaryButton type="submit" disabled={submitting}>
          {submitting ? 'Сохраняем…' : 'Сохранить пароль'}
        </PrimaryButton>
      </form>
    </section>
  )
}
