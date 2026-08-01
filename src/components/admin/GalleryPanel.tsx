import { useEffect, useRef, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import {
  fetchAllPhotos,
  uploadPhoto,
  togglePublish,
  deletePhoto,
  getPhotoUrl,
  GalleryError,
  type GalleryPhoto,
} from '../../lib/gallery'
import { PrimaryButton } from '../ui/PrimaryButton'
import { useConfirm } from './ConfirmDialog'

const inputClass =
  'mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 font-body text-blue-deep outline-none transition-colors focus:border-blue-primary'

export function GalleryPanel() {
  const confirm = useConfirm()
  const [photos, setPhotos] = useState<GalleryPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [caption, setCaption] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function load() {
    setLoading(true)
    try {
      setPhotos(await fetchAllPhotos())
    } catch (err) {
      toast.error(err instanceof GalleryError ? err.message : 'Не удалось загрузить список фото')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleUpload(e: FormEvent) {
    e.preventDefault()
    const file = fileInputRef.current?.files?.[0]
    if (!file) {
      toast.error('Выберите файл')
      return
    }

    setUploading(true)
    try {
      await uploadPhoto(file, caption)
      toast.success('Фото добавлено')
      setCaption('')
      if (fileInputRef.current) fileInputRef.current.value = ''
      await load()
    } catch (err) {
      toast.error(err instanceof GalleryError ? err.message : 'Не удалось загрузить фото')
    } finally {
      setUploading(false)
    }
  }

  async function handleTogglePublish(photo: GalleryPhoto) {
    try {
      await togglePublish(photo.id, !photo.is_published)
      setPhotos((prev) =>
        prev.map((p) => (p.id === photo.id ? { ...p, is_published: !p.is_published } : p)),
      )
    } catch (err) {
      toast.error(err instanceof GalleryError ? err.message : 'Не удалось обновить фото')
    }
  }

  async function handleDelete(photo: GalleryPhoto) {
    const ok = await confirm({
      title: 'Удалить фото?',
      message: 'Фото будет удалено из галереи и хранилища без возможности восстановления.',
      confirmLabel: 'Удалить',
      danger: true,
    })
    if (!ok) return

    try {
      await deletePhoto(photo)
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id))
      toast.success('Фото удалено')
    } catch (err) {
      toast.error(err instanceof GalleryError ? err.message : 'Не удалось удалить фото')
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="font-display text-lg font-semibold text-blue-deep">Добавить фото</h2>
        <form onSubmit={handleUpload} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col font-body text-sm text-blue-deep">
            Файл (JPEG/PNG/WebP, до 8 МБ)
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className={inputClass}
            />
          </label>
          <label className="flex flex-1 flex-col font-body text-sm text-blue-deep">
            Подпись (необязательно)
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className={inputClass}
            />
          </label>
          <PrimaryButton type="submit" size="sm" disabled={uploading}>
            {uploading ? 'Загружаем…' : 'Загрузить'}
          </PrimaryButton>
        </form>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-blue-deep">Все фото</h2>
        {loading ? (
          <p className="mt-3 font-body text-sm text-blue-deep/50">Загружаем…</p>
        ) : photos.length === 0 ? (
          <p className="mt-3 font-body text-sm text-blue-deep/50">Фото пока нет.</p>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {photos.map((photo) => (
              <div key={photo.id} className="overflow-hidden rounded-xl border border-border bg-surface">
                <img
                  src={getPhotoUrl(photo.storage_path)}
                  alt={photo.caption ?? ''}
                  className="aspect-square w-full object-cover"
                />
                <div className="p-2">
                  {photo.caption && (
                    <p className="truncate font-body text-xs text-blue-deep/70">{photo.caption}</p>
                  )}
                  <div className="mt-1 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleTogglePublish(photo)}
                      className={`font-body text-xs ${
                        photo.is_published ? 'text-mint' : 'text-blue-deep/40'
                      } hover:underline`}
                    >
                      {photo.is_published ? 'Опубликовано' : 'Скрыто'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(photo)}
                      className="font-body text-xs text-coral hover:underline"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
