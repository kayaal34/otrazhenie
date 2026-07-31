import { Link } from 'react-router-dom'
import { ApertureIntro } from '../components/ApertureIntro'
import { PrimaryLink } from '../components/ui/PrimaryLink'
import { Reveal } from '../components/Reveal'

const steps = [
  {
    title: 'Бронируешь время',
    text: 'онлайн, в удобный для тебя слот',
  },
  {
    title: 'Встаёшь перед зеркалом',
    text: 'нажимаешь на пульт — и всё происходит само',
  },
  {
    title: 'Забираешь фото',
    text: 'готовый кадр приходит на почту сразу после съёмки',
  },
]

export function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="mx-auto flex max-w-4xl flex-col items-center px-4 pt-16 pb-20 text-center sm:px-6 sm:pt-24">
        <ApertureIntro className="h-20 w-20 text-blue-primary" />

        <h1 className="mt-8 font-display text-4xl font-semibold text-blue-deep sm:text-6xl">
          Отражение
        </h1>
        <p className="mt-2 font-body text-base text-blue-deep/70 sm:text-lg">
          Студия автопортрета в Камышлове
        </p>

        <p className="mt-6 max-w-xl font-display text-xl font-medium text-blue-deep sm:text-2xl">
          Встал. Нажал на пульт. Увидел себя настоящего.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <PrimaryLink to="/booking">Забронировать время</PrimaryLink>
          <span className="font-mono text-lg text-blue-deep">3 100 ₽ / час</span>
        </div>
      </section>

      {/* Как это работает */}
      <section className="border-t border-border bg-surface px-4 py-16 sm:px-6">
        <Reveal className="mx-auto max-w-5xl">
          <h2 className="text-center font-display text-2xl font-semibold text-blue-deep sm:text-3xl">
            Как это работает
          </h2>

          <div className="relative mt-10 grid gap-10 sm:grid-cols-3">
            <div
              className="absolute top-6 right-0 left-0 hidden h-px bg-border sm:block"
              aria-hidden
            />
            {steps.map((step, i) => (
              <div key={step.title} className="relative flex flex-col items-center text-center">
                <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 border-blue-primary bg-surface font-mono text-sm text-blue-primary">
                  {String(i + 1).padStart(2, '0')}
                </div>
                <h3 className="mt-4 font-display text-base font-semibold text-blue-deep">
                  {step.title}
                </h3>
                <p className="mt-1 font-body text-sm text-blue-deep/70">{step.text}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* Цена и длительность */}
      <section className="px-4 py-16 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-2xl font-semibold text-blue-deep sm:text-3xl">
            Сколько времени тебе нужно?
          </h2>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-surface p-6">
              <p className="font-body text-sm text-blue-deep/70">1 час</p>
              <p className="mt-1 font-mono text-2xl font-semibold text-blue-deep">3 100 ₽</p>
            </div>
            <div className="relative rounded-2xl border-2 border-blue-primary bg-surface p-6">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-coral px-3 py-1 font-body text-xs font-medium text-white">
                популярный выбор
              </span>
              <p className="font-body text-sm text-blue-deep/70">2 часа</p>
              <p className="mt-1 font-mono text-2xl font-semibold text-blue-deep">5 800 ₽</p>
            </div>
          </div>

          <div className="mt-8 flex justify-center">
            <PrimaryLink to="/booking">Выбрать и забронировать</PrimaryLink>
          </div>
        </Reveal>
      </section>

      {/* Про животных */}
      <section className="border-t border-border bg-surface px-4 py-14 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-xl font-semibold text-blue-deep">
            Да, можно с питомцем 🐾
          </h2>
          <p className="mt-2 font-body text-blue-deep/70">
            Твой кот, пёс или кто угодно ещё — тоже часть твоего кадра. Просто отметь это при
            бронировании.
          </p>
        </Reveal>
      </section>

      {/* О студии — тизер */}
      <section className="px-4 py-16 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="font-display text-xl font-medium text-blue-deep sm:text-2xl">
            Это не студия с фотографом, который командует «улыбнись».
            <br />
            Это зеркало, пульт и пять минут наедине с собой.
          </p>
          <Link
            to="/about"
            className="mt-6 inline-block font-body text-sm font-medium text-blue-primary hover:underline"
          >
            Подробнее о студии →
          </Link>
        </Reveal>
      </section>
    </>
  )
}
