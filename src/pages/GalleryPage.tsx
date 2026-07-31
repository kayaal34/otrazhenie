import { useEffect, useState } from 'react'
import { fetchPublishedPhotos, getPhotoUrl, GalleryError, type GalleryPhoto } from '../lib/gallery'
import { PrimaryLink } from '../components/ui/PrimaryLink'
import { Reveal } from '../components/Reveal'

export function GalleryPage() {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPublishedPhotos()
      .then(setPhotos)
      .catch((err) => {
        setError(err instanceof GalleryError ? err.message : 'Не удалось загрузить галерею')
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <Reveal className="text-center">
        <h1 className="font-display text-2xl font-semibold text-blue-deep sm:text-3xl">
          Вот что получается у людей, которые просто зашли и нажали на кнопку
        </h1>
      </Reveal>

      <div className="mt-10">
        {loading && <p className="text-center font-body text-sm text-blue-deep/50">Загружаем…</p>}

        {!loading && error && (
          <p className="text-center font-body text-sm text-coral">{error}</p>
        )}

        {!loading && !error && photos.length === 0 && (
          <div className="mx-auto max-w-md text-center">
            <p className="font-body text-blue-deep/70">
              Пока здесь пусто — совсем скоро тут появятся первые кадры гостей.
            </p>
            <div className="mt-6 flex justify-center">
              <PrimaryLink to="/booking">Стать первым в галерее</PrimaryLink>
            </div>
          </div>
        )}

        {!loading && !error && photos.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            {photos.map((photo, i) => (
              <Reveal key={photo.id} delay={Math.min(i * 0.05, 0.3)}>
                <figure className="group overflow-hidden rounded-2xl border border-border bg-surface">
                  <img
                    src={getPhotoUrl(photo.storage_path)}
                    alt={photo.caption ?? 'Фото гостя студии «Отражение»'}
                    loading="lazy"
                    className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {photo.caption && (
                    <figcaption className="px-3 py-2 font-body text-xs text-blue-deep/60">
                      {photo.caption}
                    </figcaption>
                  )}
                </figure>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
