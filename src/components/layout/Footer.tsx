import { Link } from 'react-router-dom'
import { CONTACT_INFO } from '../../lib/contactInfo'

export function Footer() {
  return (
    <footer className="border-t border-border bg-cream px-4 py-8 sm:px-6">
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
      </div>
    </footer>
  )
}
