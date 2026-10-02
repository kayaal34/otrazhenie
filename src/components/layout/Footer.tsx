import { Link } from 'react-router-dom'
import { CONTACT_INFO } from '../../lib/contactInfo'

export function Footer() {
  return (
    <footer className="border-t border-border bg-cream px-4 pt-8 pb-28 sm:px-6 sm:pb-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 text-center">
        <p className="font-body text-sm text-blue-deep/70">
          Отражение · Студия автопортрета · {CONTACT_INFO.fullAddress}
        </p>

        <div className="flex items-center gap-4 font-body text-sm text-blue-deep/70">
          <a
            href={CONTACT_INFO.instagramUrl}
            target="_blank"
            rel="noreferrer"
            className="hover:text-blue-primary"
          >
            Instagram
          </a>
          <a
            href={CONTACT_INFO.vkUrl}
            target="_blank"
            rel="noreferrer"
            className="hover:text-blue-primary"
          >
            ВКонтакте
          </a>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 font-body text-xs text-blue-deep/50">
          <Link to="/gift-certificate" className="hover:text-blue-primary">
            Подарочный сертификат
          </Link>
          <span>·</span>
          <Link to="/manage-booking" className="hover:text-blue-primary">
            Управление бронью
          </Link>
          <span>·</span>
          <Link to="/privacy" className="hover:text-blue-primary">
            Политика конфиденциальности
          </Link>
          <span>·</span>
          <Link to="/offer" className="hover:text-blue-primary">
            Публичная оферта
          </Link>
        </div>

        <p className="font-body text-xs text-blue-deep/40">
          Разработка:{' '}
          <a
            href="https://kayaal.is-a.dev/"
            target="_blank"
            rel="noreferrer"
            className="hover:text-blue-primary"
          >
            kayaal.is-a.dev
          </a>
        </p>
      </div>
    </footer>
  )
}
