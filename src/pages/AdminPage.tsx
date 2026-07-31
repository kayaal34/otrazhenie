import { useAdminSession } from '../hooks/useAdminSession'
import { AdminLoginForm } from '../components/admin/AdminLoginForm'
import { AdminDashboard } from '../components/admin/AdminDashboard'
import { signOutAdmin } from '../lib/adminAuth'

export function AdminPage() {
  const { loading, session, isAdmin } = useAdminSession()

  if (loading) {
    return (
      <section className="mx-auto max-w-md px-4 py-24 text-center sm:px-6">
        <p className="font-body text-sm text-blue-deep/50">Загружаем…</p>
      </section>
    )
  }

  if (!session) {
    return <AdminLoginForm />
  }

  if (!isAdmin) {
    return (
      <section className="mx-auto max-w-md px-4 py-24 text-center sm:px-6">
        <h1 className="font-display text-2xl font-semibold text-blue-deep">Доступ закрыт</h1>
        <p className="mt-3 font-body text-blue-deep/70">
          Этот аккаунт не имеет прав администратора студии.
        </p>
        <button
          type="button"
          onClick={() => signOutAdmin()}
          className="mt-6 rounded-full border border-border px-4 py-2 font-body text-sm text-blue-deep hover:border-blue-primary"
        >
          Выйти
        </button>
      </section>
    )
  }

  return <AdminDashboard session={session} />
}
