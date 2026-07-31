import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <section className="mx-auto max-w-md px-4 py-24 text-center sm:px-6">
      <h1 className="font-display text-3xl font-semibold text-blue-deep">
        Страница не найдена
      </h1>
      <Link
        to="/"
        className="mt-6 inline-block font-body text-sm font-medium text-blue-primary hover:underline"
      >
        На главную
      </Link>
    </section>
  )
}
