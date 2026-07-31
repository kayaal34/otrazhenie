import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { adminLoginSchema, type AdminLoginValues } from '../../lib/adminLoginSchema'
import { signInAdmin } from '../../lib/adminAuth'
import { PrimaryButton } from '../ui/PrimaryButton'

const inputClass =
  'mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 font-body text-blue-deep outline-none transition-colors focus:border-blue-primary'
const labelClass = 'block font-body text-sm font-medium text-blue-deep'
const errClass = 'mt-1 font-body text-xs text-coral'

export function AdminLoginForm() {
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
      </form>
    </div>
  )
}
