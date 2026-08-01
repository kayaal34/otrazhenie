import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { fetchAdmins, inviteAdmin, removeAdmin, AdminError, type AdminRow } from '../../lib/admin'
import { useConfirm } from './ConfirmDialog'
import { PrimaryButton } from '../ui/PrimaryButton'

const inputClass =
  'mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 font-body text-blue-deep outline-none transition-colors focus:border-blue-primary'

type AdminsPanelProps = {
  currentUserId: string
}

export function AdminsPanel({ currentUserId }: AdminsPanelProps) {
  const confirm = useConfirm()
  const [admins, setAdmins] = useState<AdminRow[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      setAdmins(await fetchAdmins())
    } catch (err) {
      toast.error(err instanceof AdminError ? err.message : 'Не удалось загрузить администраторов')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleInvite(e: FormEvent) {
    e.preventDefault()
    const value = email.trim()
    if (!value) return

    setInviting(true)
    try {
      const redirectTo = `${window.location.origin}/admin/set-password`
      await inviteAdmin(value, redirectTo)
      toast.success(`Приглашение отправлено на ${value}`)
      setEmail('')
      await load()
    } catch (err) {
      toast.error(err instanceof AdminError ? err.message : 'Не удалось пригласить администратора')
    } finally {
      setInviting(false)
    }
  }

  async function handleRemove(admin: AdminRow) {
    const ok = await confirm({
      title: 'Удалить администратора?',
      message: `${admin.email} больше не сможет войти в админ-панель. Отменить это можно только повторным приглашением.`,
      confirmLabel: 'Удалить',
      danger: true,
    })
    if (!ok) return

    setRemovingId(admin.user_id)
    try {
      await removeAdmin(admin.user_id)
      toast.success(`${admin.email} удалён из администраторов`)
      await load()
    } catch (err) {
      toast.error(err instanceof AdminError ? err.message : 'Не удалось удалить администратора')
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="font-display text-lg font-semibold text-blue-deep">
          Пригласить администратора
        </h2>
        <form onSubmit={handleInvite} className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            className={`${inputClass} mt-0 flex-1`}
            required
          />
          <PrimaryButton type="submit" size="sm" disabled={inviting}>
            {inviting ? 'Отправляем…' : 'Пригласить'}
          </PrimaryButton>
        </form>
        <p className="mt-2 font-body text-xs text-blue-deep/50">
          На email придёт письмо со ссылкой для входа и установки пароля. Работает только для
          адресов, у которых ещё нет аккаунта.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-blue-deep">Администраторы</h2>
        {loading ? (
          <p className="mt-3 font-body text-sm text-blue-deep/50">Загружаем…</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {admins.map((admin) => (
              <li
                key={admin.user_id}
                className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3"
              >
                <div>
                  <p className="font-body text-sm text-blue-deep">
                    {admin.email}
                    {admin.user_id === currentUserId && (
                      <span className="ml-2 font-body text-xs text-blue-deep/40">(вы)</span>
                    )}
                  </p>
                  <p className="font-body text-xs text-blue-deep/50">
                    Добавлен {new Date(admin.created_at).toLocaleDateString('ru-RU')}
                  </p>
                </div>
                {admin.user_id !== currentUserId && (
                  <button
                    type="button"
                    disabled={removingId === admin.user_id}
                    onClick={() => handleRemove(admin)}
                    className="font-body text-xs text-coral hover:underline disabled:opacity-50"
                  >
                    {removingId === admin.user_id ? 'Удаляем…' : 'Удалить'}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
