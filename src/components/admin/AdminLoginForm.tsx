import { useState, type FormEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { adminLoginSchema, type AdminLoginValues } from '../../lib/adminLoginSchema'
import { signInAdmin, requestAdminPasswordReset } from '../../lib/adminAuth'
import { PrimaryButton } from '../ui/PrimaryButton'

const inputClass =
  'mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 font-body text-blue-deep outline-none transition-colors focus:border-blue-primary'
const labelClass = 'block font-body text-sm font-medium text-blue-deep'
const errClass = 'mt-1 font-body text-xs text-coral'

function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    setSubmitting(true)
    try {
      await requestAdminPasswordReset(email.trim(), `${window.location.origin}/admin/set-password`)
      setSent(true)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Не удалось отправить письмо.')
    } finally {
      setSubmitting(false)
    }
  }

  if (sent) {
    return (
      <div className="mx-auto max-w-sm py-20 text-center">
        <h1 className="font-display text-2xl font-semibold text-blue-deep">Проверьте почту</h1>
        <p className="mt-3 font-body text-sm text-blue-deep/70">
          Если такой аккаунт существует, на {email.trim()} придёт письмо со ссылкой для сброса
          пароля.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="mt-6 font-body text-sm text-blue-primary hover:underline"
        >
          ← Назад ко входу
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-sm py-20">
      <h1 className="text-center font-display text-2xl font-semibold text-blue-deep">
        Восстановление пароля
      </h1>
      <p className="mt-2 text-center font-body text-sm text-blue-deep/60">
        Укажите email администратора — пришлём ссылку для сброса пароля.
      </p>

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
        <div>
          <label className={labelClass} htmlFor="reset-email">
            Email
          </label>
          <input
            id="reset-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>

        {formError && <p className={errClass}>{formError}</p>}

        <PrimaryButton type="submit" disabled={submitting} className="mt-2">
          {submitting ? 'Отправляем…' : 'Отправить письмо'}
        </PrimaryButton>

        <button
          type="button"
          onClick={onBack}
          className="font-body text-sm text-blue-deep/50 hover:text-blue-primary"
        >
          ← Назад ко входу
        </button>
      </form>
    </div>
  )
}

export function AdminLoginForm() {
  const [mode, setMode] = useState<'login' | 'forgot'>('login')
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdminLoginValues>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: { email: '', password: '' },
  })

  async function onSubmit(values: AdminLoginValues) {
    setFormError(null)
    setSubmitting(true)
    try {
      await signInAdmin(values.email, values.password)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Не удалось войти.')
    } finally {
      setSubmitting(false)
    }
  }

  if (mode === 'forgot') {
    return <ForgotPasswordForm onBack={() => setMode('login')} />
  }

  return (
    <div className="mx-auto max-w-sm py-20">
      <h1 className="text-center font-display text-2xl font-semibold text-blue-deep">
        Вход для администратора
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 flex flex-col gap-4">
        <div>
          <label className={labelClass} htmlFor="email">
            Email
          </label>
          <input id="email" type="email" {...register('email')} className={inputClass} />
          {errors.email && <p className={errClass}>{errors.email.message}</p>}
        </div>

        <div>
          <label className={labelClass} htmlFor="password">
            Пароль
          </label>
          <input
            id="password"
            type="password"
            {...register('password')}
            className={inputClass}
          />
          {errors.password && <p className={errClass}>{errors.password.message}</p>}
        </div>

        {formError && <p className={errClass}>{formError}</p>}

        <PrimaryButton type="submit" disabled={submitting} className="mt-2">
          {submitting ? 'Входим…' : 'Войти'}
        </PrimaryButton>

        <button
          type="button"
          onClick={() => setMode('forgot')}
          className="font-body text-sm text-blue-deep/50 hover:text-blue-primary"
        >
          Забыли пароль?
        </button>
      </form>
    </div>
  )
}
