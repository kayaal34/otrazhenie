import { PrimaryLink } from '../components/ui/PrimaryLink'
import { Reveal } from '../components/Reveal'
import { CONTACT_INFO } from '../lib/contactInfo'

const steps = [
  {
    title: 'Бронируешь время',
    text: 'Заходишь на сайт, выбираешь свободный слот — час или два — и сразу оплачиваешь. Никаких звонков и переписок, чтобы согласовать время.',
  },
  {
    title: 'Встаёшь перед зеркалом',
    text: 'Приходишь к назначенному времени, выбираешь фон, который указал(а) при брони, и нажимаешь на пульт. Никого лишнего в кадре — только ты и зеркало.',
  },
  {
    title: 'Забираешь фото',
    text: 'Не нужно ждать ретуши неделями — готовый кадр приходит на почту в тот же день, пока впечатление ещё свежее.',
  },
]

export function AboutPage() {
  return (
    <>
      <section className="mx-auto max-w-2xl px-4 pt-16 pb-10 text-center sm:px-6">
        <Reveal>
          <h1 className="font-display text-3xl font-semibold text-blue-deep sm:text-4xl">
            О студии
          </h1>
          <p className="mt-6 font-display text-xl font-medium text-blue-deep sm:text-2xl">
            Это не студия с фотографом, который командует «улыбнись».
            <br />
            Это зеркало, пульт и пять минут наедине с собой.
            <br />
            Ты сам решаешь, какой момент стоит того, чтобы остаться.
          </p>
        </Reveal>
      </section>

      <section className="border-t border-border bg-surface px-4 py-16 sm:px-6">
        <Reveal className="mx-auto max-w-3xl">
          <p className="text-center font-body text-base leading-relaxed text-blue-deep/80 sm:text-lg">
            «Отражение» — это то, что не льстит и не обманывает. Оно просто показывает тебя таким,
            какой ты есть сейчас, в этот конкретный момент. Мы сделали большое пространство (более
            60 кв.м.), в которое можно прийти одному, вдвоём, компанией друзей — и даже с
            четвероногим другом и даже не одним. Никто не командует «улыбнись» и не подсказывает
            позу. Ты сам решаешь, каким получится этот момент. Не нужен опыт перед камерой и
            специальная подготовка — зеркало и пульт устроены так, что справится каждый с первого
            раза.
          </p>

          {/* Место для фото студии — добавить реальные снимки помещения,
              когда они будут готовы. */}
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex aspect-square items-center justify-center rounded-2xl border-2 border-dashed border-border font-body text-xs text-blue-deep/30"
              >
                Фото скоро
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      <section className="px-4 py-16 sm:px-6">
        <Reveal className="mx-auto max-w-5xl">
          <h2 className="text-center font-display text-2xl font-semibold text-blue-deep sm:text-3xl">
            Как это работает
          </h2>

          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {steps.map((step, i) => (
              <div key={step.title} className="flex flex-col items-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-blue-primary bg-surface font-mono text-sm text-blue-primary">
                  {String(i + 1).padStart(2, '0')}
                </div>
                <h3 className="mt-4 font-display text-base font-semibold text-blue-deep">
                  {step.title}
                </h3>
                <p className="mt-2 font-body text-sm text-blue-deep/70">{step.text}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      <section className="px-4 py-16 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-xl font-semibold text-blue-deep">
            Да, можно с питомцем 🐾
          </h2>
          <p className="mt-2 font-body text-blue-deep/70">
            Твой кот, пёс или кто угодно ещё — тоже часть твоего кадра. Просто отметь это при
            бронировании, и мы подготовим студию заранее.
          </p>
          <p className="mt-3 font-body text-sm text-blue-deep/60">
            Обязательное условие: чистые лапы и внимательный присмотр за питомцами.
          </p>
        </Reveal>
      </section>

      <section className="border-t border-border bg-surface px-4 py-16 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-xl font-semibold text-blue-deep">
            Примеры кадров
          </h2>
          <p className="mt-2 font-body text-blue-deep/70">
            Фото- и видеопримеры — в галерее гостей студии.
          </p>
          <PrimaryLink to="/gallery" size="sm" className="mt-5 inline-flex">
            Смотреть галерею
          </PrimaryLink>
        </Reveal>
      </section>

      <section className="px-4 py-16 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-xl font-semibold text-blue-deep">Контакты</h2>
          <p className="mt-2 font-body text-blue-deep/70">{CONTACT_INFO.fullAddress}</p>
          <div className="mt-4 flex items-center justify-center gap-4 font-body text-sm text-blue-primary">
            <a
              href={CONTACT_INFO.instagramUrl}
              target="_blank"
              rel="noreferrer"
              className="hover:underline"
            >
              Instagram
            </a>
            <a
              href={CONTACT_INFO.vkUrl}
              target="_blank"
              rel="noreferrer"
              className="hover:underline"
            >
              ВКонтакте
            </a>
          </div>
          <div className="mt-6 overflow-hidden rounded-xl border border-border">
            <iframe
              src={CONTACT_INFO.mapEmbedUrl}
              title="Карта — как добраться до студии"
              width="100%"
              height="320"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              style={{ border: 0, display: 'block' }}
            />
          </div>
        </Reveal>
      </section>

      <section className="px-4 py-16 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="font-display text-xl font-medium text-blue-deep sm:text-2xl">
            Готов(а) увидеть себя настоящего?
          </p>
          <PrimaryLink to="/booking" className="mt-6 inline-flex">
            Забронировать время
          </PrimaryLink>
        </Reveal>
      </section>
    </>
  )
}
