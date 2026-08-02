import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { adminLoginSchema, type AdminLoginValues } from '../../lib/adminLoginSchema'
import { signInAdmin, requestAdminPasswordReset, ADMIN_EMAIL } from '../../lib/adminAuth'
import { PrimaryButton } from '../ui/PrimaryButton'

const inputClass =
  'mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 font-body text-blue-deep outline-none transition-colors focus:border-blue-primary'
const labelClass = 'block font-body text-sm font-medium text-blue-deep'
const errClass = 'mt-1 font-body text-xs text-coral'

function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  async function handleSend() {
    setFormError(null)
    setSubmitting(true)
    try {
      await requestAdminPasswordReset()
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
          На {ADMIN_EMAIL} отправлено письмо со ссылкой для сброса пароля.
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
    <div className="mx-auto max-w-sm py-20 text-center">
      <h1 className="font-display text-2xl font-semibold text-blue-deep">
        Восстановление пароля
      </h1>
      <p className="mt-2 font-body text-sm text-blue-deep/60">
        Письмо со ссылкой для сброса пароля уйдёт строго на административный адрес:
      </p>
      <p className="mt-1 font-mono text-sm text-blue-deep">{ADMIN_EMAIL}</p>

      {formError && <p className={`${errClass} mt-3`}>{formError}</p>}

      <PrimaryButton type="button" disabled={submitting} onClick={handleSend} className="mt-6">
        {submitting ? 'Отправляем…' : 'Отправить письмо'}
      </PrimaryButton>

      <button
        type="button"
        onClick={onBack}
        className="mt-4 block w-full font-body text-sm text-blue-deep/50 hover:text-blue-primary"
      >
        ← Назад ко входу
      </button>
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
